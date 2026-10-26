/// <reference lib="webworker" />
// Builds the orchard off the main thread, from the database the page loaded.
import type { ClassCatalog } from "./classCatalog";
import { getForest } from "./forest";

self.onmessage = (e: MessageEvent<{ id: number; catalog: ClassCatalog; home: string; bonds: number; prune: boolean }>) => {
  const forest = getForest(e.data.catalog, e.data.home, e.data.bonds, e.data.prune);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id: e.data.id, forest });
};
