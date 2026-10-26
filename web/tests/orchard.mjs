// The orchard the forest tests build: the subset that ships with proteusPy,
// 4,575 of its 5,000 bonds within proteusPy's Ca and Sg cutoffs, as its web
// export writes it, trimmed to keep the fixture small:
//
//   proteusPy.export_web --database subset --members-per-class 3 --min-members 5 --out <dir>
//
// then catalog.json, atoms.json and the home bond's card (bonds/<home>.json)
// copied into fixtures/subset/. The PDB is public; nothing here is private.
import { readFileSync } from "node:fs";

export const SUBSET = JSON.parse(readFileSync(new URL("./fixtures/subset/catalog.json", import.meta.url)));
export const ATOMS = JSON.parse(readFileSync(new URL("./fixtures/subset/atoms.json", import.meta.url)));
export const HOME_BOND = JSON.parse(readFileSync(new URL(`./fixtures/subset/bonds/${SUBSET.home}.json`, import.meta.url)));

/** getForest's arguments: the database and its default home disulfide. */
export function orchardArgs() {
  return [SUBSET, SUBSET.home];
}
