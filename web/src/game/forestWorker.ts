/// <reference lib="webworker" />
// Builds the orchard off the main thread, from the database the page loaded.
import type { ClassCatalog } from "./classCatalog";
import { getForest } from "./forest";

self.onmessage = (e: MessageEvent<{ id: number; catalog: ClassCatalog; home: string }>) => {
  const forest = getForest(e.data.catalog, e.data.home);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id: e.data.id, forest });
};
