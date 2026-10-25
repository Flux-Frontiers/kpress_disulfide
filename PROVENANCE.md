# Provenance

This repository started as a copy of
[kpress_family](https://github.com/Flux-Frontiers/kpress_family)
(The Knowledge Press: The Family), which itself started as a copy of
[knowledge_press](https://github.com/Flux-Frontiers/knowledge_press)
(The Forest). The three are maintained separately: a fix made in one is
not made in the others unless someone ports it.

## Source

- Repository: `Flux-Frontiers/kpress_family`
- Commit: `22699d8` ("Merge pull request #19 from
  Flux-Frontiers/feat/home-line-marks"), kpress_family 0.1.0
- Copied: 2026-10-25, with `git archive`, so only tracked files

To see what has drifted since, diff a path against that commit, for
example:

```bash
git -C ../kpress_family diff 22699d8 -- web/src/game/familyTree.ts
```

## What was copied, and what changed in the copy

| Here | From kpress_family | Changes |
|---|---|---|
| `web/` | `web/` | package renamed `kpress-disulfide`, version 0.1.0, page title; `web/README.md` no longer links `LAYOUT.md` |
| `LICENSE`, `TRADEMARK.md`, `.gitignore` | same paths | none |
| `.pre-commit-config.yaml` | same path | header comment: no Swift package |
| `.github/workflows/ci.yml` | same path | header comment |
| `.github/workflows/web.yml` | same path | header comment |
| `Makefile` | `Makefile` | header rewritten; the Swift kit targets removed; nothing that publishes |
| `CITATION.cff` | `CITATION.cff` | rewritten for The Disulfides; cites proteusPy, knowledge_press and kpress_family |

Not copied: the Swift kit (`app/`, and with it `.github/workflows/app.yml`),
`renders/`, `CHANGELOG.md`, `README.md` and `web/LAYOUT.md`, which is
rewritten for the disulfide orchard.

## Still the Family's

The orchard reads the disulfide database (`web/src/game/classCatalog.ts`,
written by proteusPy's `proteusPy.export_web`; `make forest`). The reader
is class and bond cards (`ClassReader.tsx`, `classCards.ts`), and the HUD,
tour, album ranks and About speak of classes and bonds. Still the
Family's, to be rewritten:

- `web/README.md`.
