# Release Notes -- v0.2.0

> Released: 2026-10-28

The orchard is now on the web. The Disulfides is published on GitHub Pages,
https://flux-frontiers.github.io/kpress_disulfide/, built and deployed from
`main`, with a user guide beside it. The orchard shows one database, the full
published set of 158,965 bonds in 35,367 structures, and its schematic view
draws far fewer triangles.

## What changed

**Published on GitHub Pages.** The Web workflow builds the orchard and deploys
it on every push to `main`. The databases and the Spirits' models are not in
the repository; the workflow takes them from the draft `web-data` release,
which `make web-data-publish` uploads. Publishing no longer leaves a second,
empty draft behind when GitHub answers slowly.

**A user guide.** https://flux-frontiers.github.io/kpress_disulfide/docs/
covers getting started, what the trees and groves show, driving and the
guided tour, reading a class or bond, finding and linking, the exhibits, the
settings and troubleshooting. It is written in `docs/`, built with
mkdocs-material by the same workflow, and linked from the About dialog.

**The full database only.** The app and the site offer only the full
database. The subset that ships with proteusPy is kept as the test fixture.
The README's badges give the disulfide and structure counts.

**A lighter schematic view.** Each sampled bond in schematic mode is a
dodecahedron, 36 triangles in place of a 352-triangle sphere. On Ultra with
shadows on, a frame peaks around 1M triangles in place of 9.8M.

**Eureka's plaque.** The Spirit of Innovation's plaque now says what she
does: she pulls the idea from her mind and her heart, and joining the two
halves of the chip is the symbolic act.

## Upgrading

Nothing to do to use it: open the site. To run it locally, `make forest` now
exports only the full database (the `FOREST` variable is gone), and
`make demos` is `make art` and `make forest`. `make docs-install` and
`make docs` build the guide; `make docs-serve` previews it.

---

_Full changelog: [CHANGELOG.md](CHANGELOG.md)_
