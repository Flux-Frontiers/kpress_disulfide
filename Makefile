# The Knowledge Press: The Disulfides -- the web orchard (web/) for the
# proteusPy disulfide database.
#
# Author: Eric G. Suchanek, PhD -- Flux-Frontiers, Liberty TWP, OH
# Copyright (c) 2026 Eric G. Suchanek, PhD. Elastic License 2.0; see LICENSE.
#
# Started as a copy of kpress_family; see PROVENANCE.md. Nothing here
# publishes, uploads or deploys. proteusPy writes the databases
# (proteusPy.export_web, from the sibling checkout); `make forest` only
# drives it.
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
#   make forest FOREST=subset|full [FOREST_TITLE="..."] [FOREST_HOME=<key>]
#                      -- proteusPy.export_web from $(PROTEUSPY_DIR), then
#                         refresh the index. The subset is the 5,000 bonds
#                         that ship with proteusPy; full is the whole loader
#                         (about 11 s and 57 MB)
#   make demos         -- the subset

PROTEUSPY_DIR ?= ../proteusPy
FOREST ?= subset
FOREST_TITLE ?= $(if $(filter full,$(FOREST)),The full database,The 5000-bond subset)
# The disulfide the monument opens on; empty lets the export pick the lowest-energy bond.
FOREST_HOME ?=
# Members sampled per octant class, and the least members an octant class
# needs for its own tip (empty: the export's default, 2 on the subset, 20 on the full database).
FOREST_MEMBERS ?= 12
FOREST_MIN_MEMBERS ?=

.PHONY: web-install web-dev web-test web-build web-preview web-kill forest demos gallery

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
	@case "$(FOREST)" in subset|full) ;; *) echo "set FOREST to subset or full"; exit 1 ;; esac
	cd $(PROTEUSPY_DIR) && env -u VIRTUAL_ENV -u POETRY_ACTIVE poetry run proteusPy.export_web \
		--database $(FOREST) --out $(abspath web/public/forests/$(FOREST)) --members-per-class $(FOREST_MEMBERS) \
		$(if $(FOREST_MIN_MEMBERS),--min-members $(FOREST_MIN_MEMBERS)) $(if $(FOREST_HOME),--home $(FOREST_HOME)) --force
	printf '{"title": "%s", "home": "%s"}\n' "$(FOREST_TITLE)" "$(FOREST_HOME)" > web/public/forests/$(FOREST)/about.json
	cd web && node scripts/forests.mjs

demos:
	$(MAKE) forest FOREST=subset

gallery:
	cd web && node scripts/gallery.mjs
