import { useEffect, useMemo, useRef, useState } from "react";
import { About } from "./About";
import { ForestCanvas } from "./ForestCanvas";
import { HUD, viewWholeTree } from "./HUD";
import { PauseOverlay } from "./PauseOverlay";
import { StartScreen } from "./StartScreen";
import { TouchControls } from "./TouchControls";
import { installControlsTest } from "./controlsTest";
import { treeFromSearch } from "./deepLink";
import { commonFrame, portraitPose, shotSlug, treeExtent, type Extent, type Frame } from "./portrait";
import { chooseForest, indexCatalog, loadForestCatalog, loadForestIndex, type ClassCatalog, type ForestEntry } from "./classCatalog";
import { ASSET_ROOT } from "./ClassReader";
import { savedForest } from "./forestChoice";
import { getForest, treeApproach, type Forest } from "./forest";
import { BOND_CAP } from "./preferences";
import { GROW_VERSION } from "./growTree";
import { bindInput, isInputTarget } from "./input";
import { requestPlace } from "./location";
import { resetSim } from "./sim";
import { unlockSpeechOnGesture } from "./speech";
import { useGame } from "./store";


export function ForestApp() {
  const [mounted, setMounted] = useState(false);
  const [forest, setForest] = useState<Forest | null>(null);
  const [catalog, setCatalog] = useState<ClassCatalog | null>(null);
  const [forests, setForests] = useState<ForestEntry[]>([]);
  const forestSlug = useGame((s) => s.familySlug);
  const entry = forests.find((f) => f.slug === forestSlug);
  // `?home=<key>` opens on that disulfide's monument; then the one chosen in
  // the reader (setHome); then the database's own (FOREST_HOME); otherwise
  // the export's, its lowest-energy bond. A home must be a sampled member,
  // whose bond card the export wrote, or the export's own.
  const home = useGame((s) => s.home);
  // Sampled bonds shown per octant class: the orchard regrows when this changes.
  const bonds = useGame((s) => BOND_CAP[s.preferences.bonds]);
  const index = useMemo(() => (catalog ? indexCatalog(catalog) : null), [catalog]);
  const focal = useMemo(() => {
    if (!catalog || !index) return "";
    const has = (key: string | null) => key !== null && (index.memberOf.has(key) || key === catalog.home);
    const asked = new URLSearchParams(window.location.search).get("home");
    const named = entry?.home ?? null;
    return has(asked) ? asked! : has(home) ? home! : has(named) ? named! : catalog.home;
  }, [catalog, index, home, entry?.home]);
  const playing = useGame((s) => s.playing);
  const play = useGame((s) => s.play);
  const setToast = useGame((s) => s.setToast);
  const toast = useGame((s) => s.toast);

  // The sky follows the clock: sun and moon move a few hundredths of a degree between ticks.
  useEffect(() => {
    const id = window.setInterval(() => useGame.getState().tickSky(), 5000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    // For true sunrise and sunset (location.ts).
    if (playing) requestPlace(useGame.getState().place, useGame.getState().setPlace);
  }, [playing]);

  useEffect(() => {
    setMounted(true);
    const unbind = bindInput();
    installControlsTest();
    const unlockSpeech = unlockSpeechOnGesture();
    return () => { unbind?.(); unlockSpeech(); };
  }, []);

  // The database: `?forest=<slug>`, else the one chosen last time, else the
  // first in public/forests/index.json.
  useEffect(() => {
    loadForestIndex(ASSET_ROOT).catch(() => null).then((list) => {
      if (!list) throw new Error("no databases in forests/index.json; run make forest");
      setForests(list);
      const chosen = chooseForest(list, new URLSearchParams(window.location.search).get("forest"), savedForest());
      const base = `${ASSET_ROOT}forests/${chosen.slug}/`;
      useGame.getState().useFamily(chosen.slug, base);
      return loadForestCatalog(base).then(setCatalog);
    }).catch((err: Error) => setToast(err.message));
  }, [setToast]);

  // Grow in a worker, regrowing when the home tree changes; only the first
  // forest places the cart. Without Worker support, grow on the main thread.
  const placed = useRef(false);
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  useEffect(() => {
    try {
      worker.current = new Worker(new URL("./forestWorker.ts", import.meta.url), { type: "module" });
    } catch {
      worker.current = null;
    }
    return () => worker.current?.terminate();
  }, []);
  useEffect(() => {
    if (catalog) useGame.getState().keepLines(catalog.lines.map((l) => l.id));
  }, [catalog]);

  useEffect(() => {
    if (!catalog || !focal) return;
    const apply = (f: Forest) => {
      if (!placed.current) resetSim(f);
      else useGame.getState().setToast(null);
      placed.current = true;
      setForest(f);
      window.__gameReady = true;
    };
    const id = ++request.current;
    if (placed.current) useGame.getState().setToast("Growing the orchard...");
    const w = worker.current;
    if (w) {
      // Only the latest request wins if the level changes again mid-growth.
      w.onmessage = (e: MessageEvent<{ id: number; forest: Forest }>) => {
        if (e.data.id === request.current) apply(e.data.forest);
      };
      w.postMessage({ id, catalog, home: focal, bonds });
      return;
    }
    const t = window.setTimeout(() => apply(getForest(catalog, focal, bonds)), 0);
    return () => window.clearTimeout(t);
  }, [catalog, focal, bonds, GROW_VERSION]);

  // `?tree=<slug>` opens the drive beside that book's tree instead of at home.
  const linked = useMemo(() => (forest ? treeFromSearch(window.location.search, forest.trees) : undefined), [forest]);

  // `?shot=<slug>`: the tree alone, at midday in summer, for the book gallery (portrait.ts).
  // `window.__shot(slug)` aims at another tree without regrowing the forest.
  const shot = useGame((s) => s.portrait);
  useEffect(() => {
    const first = shotSlug(window.location.search);
    if (!forest || !first) return;
    const extentOf = (slug: string) => {
      const t = forest.trees.find((tr) => tr.line.slug === slug);
      return t ? treeExtent(forest.chunks[t.chunk]!.bark.pos, t.woodStart, t.woodCount, t.x, t.z) : null;
    };
    const aim = (slug: string, frame?: Frame): boolean => {
      const tree = forest.trees.findIndex((t) => t.line.slug === slug);
      if (tree < 0) return false;
      window.__shotReady = false;
      const t = forest.trees[tree]!;
      useGame.getState().setPortrait({ ...portraitPose(t, extentOf(slug)!, Math.PI / 2, frame), tree });
      return true;
    };
    const st = useGame.getState();
    st.setPreferences({ camera: "follow", fog: "light", weather: false, motion: false });
    st.setSeason("summer");
    const time = new URLSearchParams(window.location.search).get("time");
    st.setTimeMode(time === "dawn" || time === "dusk" ? time : "day");
    resetSim(forest);
    aim(first);
    play();
    window.__shot = aim;
    window.__shotExtent = extentOf;
    window.__shotFrame = (slugs) => commonFrame(slugs.map(extentOf).filter((e): e is Extent => e !== null));
    return () => { window.__shot = undefined; window.__shotExtent = undefined; window.__shotFrame = undefined; };
  }, [forest, play]);

  useEffect(() => {
    if (!forest) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("qa") === "1") play();
  }, [forest, play]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast, setToast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const st = useGame.getState();
      // About: ? anywhere, the start screen too. Its dialog handles Escape itself.
      if (e.key === "?" && !st.paused && !st.readingSlug && !isInputTarget(e.target)) { st.toggleHelp(); return; }
      if (!st.playing) return;
      if (e.code === "Escape") {
        if (st.paused || st.helpOpen) return; // The settings and About dialogs handle Escape themselves.
        if (st.readingSlug) st.openReader(null);
        else if (st.plaque) st.openPlaque(null);
        else if (st.catalogOpen) st.setCatalogOpen(false);
        else if (st.atlasOpen) st.setAtlasOpen(false);
        else if (st.libraryOpen) st.toggleLibrary();
        else st.pause(true);
        return;
      }
      // The reader, the moots and the settings take the keyboard; only Escape reaches past them.
      if (st.paused || st.readingSlug || isInputTarget(e.target)) return;
      if (e.code === "KeyL") st.toggleLibrary();
      if (e.code === "KeyG") st.toggleAtlas();
      if (e.code === "KeyB") st.toggleCatalog();
      if (e.code === "KeyQ") st.toggleCircuit();
      if (e.code === "KeyC") {
        const next = { follow: "high", high: "cart", cart: "god", god: "follow" } as const;
        st.setPreferences({ camera: next[st.preferences.camera] });
      }
      if (e.code === "KeyV") st.setPreferences({ schematic: !st.preferences.schematic });
      if (e.code === "KeyN") st.setPreferences({ names: !st.preferences.names });
      if (e.code === "KeyH" && forest) {
        st.selectGrove(null);
        st.requestJump(forest.home, "Home · the hub");
      }
      if (e.code === "KeyT" && forest) viewWholeTree(forest);
    }
    window.addEventListener("keydown", onKey);
    function onBlur() {
      // Not over About: its location button's permission prompt takes the focus.
      if (useGame.getState().playing && !useGame.getState().helpOpen) useGame.getState().pause(true);
    }
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [forest]);

  return (
    <main onPointerUp={(e) => {
      const button = (e.target as HTMLElement).closest("button");
      if (button && !button.closest("dialog")) button.blur();
    }} className="relative h-dvh w-full overflow-hidden bg-bg text-fg" style={{ touchAction: "none" }}>
      {/* While the orchard grows, the wash alone: a picture would show one database while another loads.
          The live orchard then fades in over it. */}
      <div className="absolute inset-0 start-wash" />
      {mounted && forest ? (
        <div className="forest-fade-in absolute inset-0">
          <ForestCanvas forest={forest} catalog={catalog} />
        </div>
      ) : null}
      {playing && forest && !shot ? (
        <>
          <HUD forest={forest} index={index} />
          <TouchControls />
          <PauseOverlay />
        </>
      ) : shot ? null : (
        <StartScreen
          forests={forests}
          forest={forestSlug}
          ready={Boolean(forest)}
          growing={!forest}
          opensAt={linked?.line.title}
          onEnter={(tour) => {
            if (forest) {
              resetSim(forest);
              play();
              // The tour sets off from home; a `?tree=` link is for driving there.
              if (tour) useGame.getState().toggleCircuit();
              else if (linked) {
                const st = useGame.getState();
                st.pickSearch(linked.line.slug);
                st.pinTree(linked.line.slug);
                st.requestJump(treeApproach(linked, forest.home.x, forest.home.z), linked.line.title);
              }
            }
          }}
        />
      )}
      {shot ? null : <About />}
    </main>
  );
}
