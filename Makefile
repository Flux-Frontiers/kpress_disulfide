# The Knowledge Press: The Disulfides -- the web orchard (web/) for the
# proteusPy disulfide database.
#
# Author: Eric G. Suchanek, PhD -- Flux-Frontiers, Liberty TWP, OH
# Copyright (c) 2026 Eric G. Suchanek, PhD. Elastic License 2.0; see LICENSE.
#
# Started as a copy of kpress_family; see PROVENANCE.md. proteusPy writes
# the databases (proteusPy.export_web, from the sibling checkout); `make
# forest` only drives it. Only `make web-data-publish` uploads anything: the
# databases and models for the Pages site.
#
# The web orchard (web/):
#   make web-install   -- npm install
#   make web-dev       -- Vite dev server on port 5173
#   make web-test      -- the node test suite
#   make web-build     -- typecheck and production build
#   make web-preview   -- production build, served like web-dev
#   make web-kill      -- stop every running Vite dev or preview server
#   make gallery       -- a portrait of each class tree into renders/lines
#                         (needs make web-dev running and puppeteer-core)
#
# Databases (web/public/forests/<slug>, never committed):
#   make forest [FOREST_TITLE="..."] [FOREST_HOME=<key>]
#                      -- proteusPy.export_web of the full database from
#                         $(PROTEUSPY_DIR), then refresh the index. Only
#                         bonds within proteusPy's Ca and Sg cutoffs: the
#                         published set, 158,965 (about 11 s and 52 MB)
#   make demos         -- `make forest` and `make art`
#   make web-data-publish
#                      -- upload web/public/forests and web/public/models for
#                         the Pages build, then redeploy
#   make art           -- copy the Spirit of Life's models from
#                         $(ART_TECHNO_DIR) (Art Techno, CC BY-NC 4.0)

PROTEUSPY_DIR ?= ../proteusPy
# Art Techno, whose Spirit of Life stands in an exhibit glade (`make art`).
ART_TECHNO_DIR ?= ../art_techno
FOREST_TITLE ?= The full database
# The disulfide the monument opens on; empty lets the export pick the lowest-energy bond.
FOREST_HOME ?=
# Members sampled per octant class, and the least members an octant class
# needs for its own tip (empty: the export's default, 20).
FOREST_MEMBERS ?= 12
FOREST_MIN_MEMBERS ?=

.PHONY: web-install web-dev web-test web-build web-preview web-kill forest demos art gallery web-data-publish

web-install:
	cd web && npm install

web-dev:
	cd web && npm run dev

web-test:
	cd web && npm test

web-build:
	cd web && npm run build

web-preview: web-build
	cd web && npm run preview

# Matched by command line, not port: `npm run dev` moves to 5174 when 5173 is
# taken, and a preview server shares 5173. Stops Vite from any checkout.
web-kill:
	@pids=$$(pgrep -f '^([^ ]*/)?node [^ ]*node_modules/(\.bin/vite|vite/bin/vite\.js)( |$$)'); \
	if [ -z "$$pids" ]; then echo "no Vite servers running"; exit 0; fi; \
	ps -o pid=,command= -p "$$(echo $$pids | tr ' ' ',')"; \
	kill $$pids && echo "stopped: $$(echo $$pids)"

forest:
	cd $(PROTEUSPY_DIR) && env -u VIRTUAL_ENV -u POETRY_ACTIVE poetry run proteusPy.export_web \
		--database full --out $(abspath web/public/forests/full) --members-per-class $(FOREST_MEMBERS) \
		$(if $(FOREST_MIN_MEMBERS),--min-members $(FOREST_MIN_MEMBERS)) $(if $(FOREST_HOME),--home $(FOREST_HOME)) --force
	printf '{"title": "%s", "home": "%s"}\n' "$(FOREST_TITLE)" "$(FOREST_HOME)" > web/public/forests/full/about.json
	cd web && node scripts/forests.mjs

demos: art forest

# The Spirits of Life and Innovation from Art Techno (CC BY-NC 4.0; see
# PROVENANCE.md), into web/public/models, which is never committed, and a
# simplified copy of each into models/far, drawn from afar (Spirits.tsx):
# welded and simplified to SPIRIT_FAR of Art Techno's lighter export, its
# maps cut to SPIRIT_FAR_PX, with Art Techno's own gltf-transform.
GLTF_TRANSFORM ?= $(ART_TECHNO_DIR)/web/node_modules/.bin/gltf-transform
SPIRIT_FAR ?= 0.15
SPIRIT_FAR_PX ?= 512
SPIRITS = life innovation-eureka

art:
	mkdir -p web/public/models/mobile web/public/models/far
	cp $(ART_TECHNO_DIR)/web/public/models/life.glb web/public/models/life.glb
	cp $(ART_TECHNO_DIR)/web/public/models/mobile/life.glb web/public/models/mobile/life.glb
	cp $(ART_TECHNO_DIR)/web/public/models/innovation-eureka.glb web/public/models/innovation-eureka.glb
	cp $(ART_TECHNO_DIR)/web/public/models/mobile/innovation-eureka.glb web/public/models/mobile/innovation-eureka.glb
	tmp=$$(mktemp -d) && for m in $(SPIRITS); do \
	  $(GLTF_TRANSFORM) weld web/public/models/mobile/$$m.glb $$tmp/$$m-w.glb && \
	  $(GLTF_TRANSFORM) simplify $$tmp/$$m-w.glb $$tmp/$$m-s.glb --ratio $(SPIRIT_FAR) --error 0.002 && \
	  $(GLTF_TRANSFORM) resize $$tmp/$$m-s.glb $$tmp/$$m-r.glb --width $(SPIRIT_FAR_PX) --height $(SPIRIT_FAR_PX) && \
	  $(GLTF_TRANSFORM) meshopt $$tmp/$$m-r.glb web/public/models/far/$$m.glb || exit 1; \
	done; rm -rf $$tmp

gallery:
	cd web && node scripts/gallery.mjs

# The Pages site (web.yml) is built from git, and the databases and models are
# not in git: web-data-publish packs web/public/forests and web/public/models
# into web-data.tar.gz on the WEB_DATA_TAG release, which web.yml unpacks into
# the build, and redeploys Pages. Run it after `make forest` and `make art`
# change what should be live. The release stays a
# draft because Zenodo archives every published release; web.yml needs
# contents: write to read a draft. The draft is created only when the release
# list has none under WEB_DATA_TAG; a failed lookup stops the publish instead
# of creating a second draft.
WEB_DATA_TAG ?= web-data
WEB_DATA_TARBALL := $(patsubst %/,%,$(or $(TMPDIR),/tmp))/web-data.tar.gz

web-data-publish:
	@test -f web/public/forests/index.json \
	  || { echo "No databases in web/public/forests -- run 'make forest' first."; exit 1; }
	@test -n "$$(ls web/public/models 2>/dev/null)" \
	  || { echo "No models in web/public/models -- run 'make art' first."; exit 1; }
	COPYFILE_DISABLE=1 tar -czf "$(WEB_DATA_TARBALL)" -C web/public forests models
	ids=$$(gh api 'repos/{owner}/{repo}/releases' --paginate --jq '.[] | select(.tag_name == "$(WEB_DATA_TAG)") | .id') \
	  || exit 1; \
	[ -n "$$ids" ] || gh release create $(WEB_DATA_TAG) --draft --title "Databases and models for the web orchard" \
	       --notes "web-data.tar.gz: web/public/forests (proteusPy.export_web, make forest) and web/public/models (make art) for the Pages build. Kept a draft so Zenodo does not archive it; do not publish."
	gh release upload $(WEB_DATA_TAG) "$(WEB_DATA_TARBALL)" --clobber
	rm -f "$(WEB_DATA_TARBALL)"
	gh workflow run web.yml --ref main
