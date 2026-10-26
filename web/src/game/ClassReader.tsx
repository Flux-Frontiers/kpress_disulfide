import { Canvas, useFrame } from "@react-three/fiber";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";
import { loadBond, type BondCard, type ClassIndex, type Molecule } from "./classCatalog";
import { angleSpread, bondName, classCard, levelName, rcsbUrl, readerPages, trail, type ClassCardData } from "./classCards";
import { percent } from "./classForest";
import { moleculeExtent } from "./forest";
import { ballAndStick } from "./molecule";
import { BallAndStickMesh, useAtoms } from "./Molecules";
import { useGame } from "./store";

/** Where the app is served from; the databases sit under it (`make forest`, never committed). */
export const ASSET_ROOT = import.meta.env.BASE_URL;

/** The page each tree was left at, for this session. */
const lastPage = new Map<string, string>();
/** A class or bond on another tree, clicked: the page that tree opens on. */
let pendingPage: string | null = null;

/** Open the reader on one class or sampled bond of a tree (a bead tapped in schematic mode). */
export function openRecord(lineSlug: string, id: string): void {
  pendingPage = id;
  useGame.getState().openReader(lineSlug);
}

type Load<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; value: T };

const CHI = ["χ1", "χ2", "χ3", "χ4", "χ5"];

/** A link that turns the reader to a class or bond page. */
function PageLink({ id, onVisit, children }: { id: string; onVisit: (id: string) => void; children?: ReactNode }) {
  return (
    <button type="button" onClick={() => onVisit(id)} className="text-left text-primary underline-offset-2 hover:underline">
      {children ?? id}
    </button>
  );
}

/** A link out to the PDB entry's page at the RCSB. */
function RcsbLink({ id }: { id: string }) {
  return (
    <a href={rcsbUrl(id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
      {id.toUpperCase()} <ExternalLink className="size-3" strokeWidth={1.75} aria-label="at the RCSB" />
    </a>
  );
}

/** Its children, turning slowly about the vertical. */
function Turntable({ children }: { children: ReactNode }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.4;
  });
  return <group ref={g}>{children}</group>;
}

/** A molecule drawn ball-and-stick in its own small canvas, as the orchard draws it. */
function MoleculeView({ model, label }: { model: Molecule; label: string }) {
  const base = useGame((s) => s.familyBase);
  const atoms = useAtoms(base);
  const drawn = useMemo(() => (atoms ? ballAndStick(model, atoms, { x: 0, y: 0, z: 0, yaw: 0, scale: 1 }) : null), [atoms, model]);
  const reach = moleculeExtent(model);
  return (
    <figure className="grid gap-1">
      <div className="h-56 w-full overflow-hidden rounded-md border border-border bg-bg sm:h-64" role="img" aria-label={label}>
        <Canvas camera={{ position: [0, 0, reach * 3.1], fov: 40 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[4, 6, 5]} intensity={2.2} />
          <Turntable>{drawn ? <BallAndStickMesh balls={drawn.balls} sticks={drawn.sticks} /> : null}</Turntable>
        </Canvas>
      </div>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  );
}

/** chi1..chi5 as a row of cells: mean and spread for a class, the angle for a bond. */
function Torsions({ chi, std }: { chi: number[]; std?: number[] }) {
  return (
    <dl className="grid grid-cols-5 gap-2 text-sm">
      {chi.map((c, i) => (
        <div key={i} className="rounded-md border border-border p-2">
          <dt className="text-xs text-muted">{CHI[i]}</dt>
          <dd className="tabular-nums">{std ? angleSpread(c, std[i]!) : `${c.toFixed(1)}°`}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-sm tracking-wide text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

const bonds = (n: number) => (n === 1 ? "one bond" : `${n.toLocaleString("en-US")} bonds`);

/** A class's card: its counts and geometry, its model, its parent and children, and its sampled bonds. */
function ClassPage({ card, index, onVisit }: { card: ClassCardData; index: ClassIndex; onVisit: (id: string) => void }) {
  const childLabel = (id: string) => {
    const c = index.cls.get(id);
    return c ? `${c.level === "other" ? "folded octant classes" : id} · ${bonds(c.count)}` : id;
  };
  return (
    <div className="mx-auto grid max-w-[65ch] gap-5 text-fg/95">
      <p className="font-display text-lg leading-relaxed lining-nums">
        {bonds(card.count)}, {percent(card.percentage)} of the database{card.family === card.line ? "" : `, in the ${card.family} family`}.
        {card.function ? ` Function: ${card.function}.` : ""}
      </p>
      {card.consensus ? (
        <Section title="Consensus torsions, mean ± standard deviation">
          <Torsions chi={card.consensus.chi} std={card.consensus.std} />
        </Section>
      ) : null}
      {card.energy || card.ca_distance ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {card.energy ? (
            <div><dt className="text-muted">Torsional energy</dt><dd className="tabular-nums">{card.energy.mean.toFixed(2)} ± {card.energy.std.toFixed(2)} kcal/mol</dd></div>
          ) : null}
          {card.ca_distance ? (
            <div><dt className="text-muted">Cα distance</dt><dd className="tabular-nums">{card.ca_distance.mean.toFixed(2)} ± {card.ca_distance.std.toFixed(2)} Å</dd></div>
          ) : null}
        </dl>
      ) : null}
      {card.model ? <MoleculeView model={card.model} label={`The model disulfide built from ${card.id}'s consensus torsions.`} /> : null}
      <section className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <h3 className="mb-1 tracking-wide text-muted uppercase">Parent</h3>
          {card.parent ? <PageLink id={card.parent} onVisit={onVisit} /> : <p className="text-muted">None: a binary class is a tree's trunk</p>}
        </div>
        {card.level === "binary" || card.level === "quadrant" ? (
          <div>
            <h3 className="mb-1 tracking-wide text-muted uppercase">{card.level === "binary" ? "Quadrant classes" : "Octant classes"}</h3>
            <ul className="grid gap-1">{card.children.map((id) => <li key={id}><PageLink id={id} onVisit={onVisit}>{childLabel(id)}</PageLink></li>)}</ul>
          </div>
        ) : null}
      </section>
      {card.folded.length ? (
        <Section title="Octant classes folded in, too sparse for their own tip">
          <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
            {card.folded.map((f) => <li key={f.id} className="tabular-nums">{f.id} · {bonds(f.count)}</li>)}
          </ul>
        </Section>
      ) : null}
      {card.members.length ? (
        <Section title={`Sampled bonds, lowest energy first · ${card.members.length} of ${card.count.toLocaleString("en-US")}`}>
          <table className="w-full text-sm">
            <tbody>
              {card.members.map((m) => (
                <tr key={m.key} className="border-b border-border">
                  <td className="py-1"><PageLink id={m.key} onVisit={onVisit} /></td>
                  <td className="py-1 text-right tabular-nums">{m.energy.toFixed(2)} kcal/mol</td>
                  <td className="py-1 pl-3 text-right"><RcsbLink id={m.pdbId} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}
    </div>
  );
}

/** A sampled bond's card: where it is in the PDB, its geometry, its classes, and its own coordinates drawn. */
function BondPage({ bond, onVisit }: { bond: BondCard; onVisit: (id: string) => void }) {
  const tiers = [["Binary", bond.classes.binary], ["Quadrant", bond.classes.quadrant], ["Octant", bond.classes.octant]] as const;
  return (
    <div className="mx-auto grid max-w-[65ch] gap-5 text-fg/95">
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div><dt className="text-muted">PDB entry</dt><dd><RcsbLink id={bond.pdb_id} /></dd></div>
        <div><dt className="text-muted">Residues</dt><dd>Cys {bond.proximal} chain {bond.proximal_chain}, Cys {bond.distal} chain {bond.distal_chain}</dd></div>
        <div><dt className="text-muted">Resolution</dt><dd className="tabular-nums">{bond.resolution > 0 ? `${bond.resolution.toFixed(2)} Å` : "Not given"}</dd></div>
        <div><dt className="text-muted">Torsional energy</dt><dd className="tabular-nums">{bond.energy.toFixed(2)} kcal/mol</dd></div>
        <div><dt className="text-muted">Cα distance</dt><dd className="tabular-nums">{bond.ca_distance.toFixed(2)} Å</dd></div>
        <div><dt className="text-muted">Sγ distance</dt><dd className="tabular-nums">{bond.sg_distance.toFixed(2)} Å</dd></div>
      </dl>
      <Section title="Torsions">
        <Torsions chi={bond.torsions} />
      </Section>
      <MoleculeView model={bond} label={`${bondName(bond)}, drawn from its coordinates in the Protein Data Bank.`} />
      <Section title="Its class at each tier">
        <ul className="grid gap-1 text-sm sm:grid-cols-3">
          {tiers.map(([tier, id]) => <li key={tier}><span className="text-muted">{tier} </span><PageLink id={id} onVisit={onVisit} /></li>)}
        </ul>
      </Section>
    </div>
  );
}

/**
 * The reader: one tree's pages, from its binary class down through its
 * quadrant and octant classes to their sampled bonds. A class page is built
 * from the catalog; a bond page is fetched from bonds/<key>.json. A link to a
 * class or bond on this tree turns the page; on another tree it opens that tree.
 */
export function ClassReader({ index, line, home }: { index: ClassIndex; line: string; home: string }) {
  const close = () => useGame.getState().openReader(null);
  const base = useGame((s) => s.familyBase);
  /** Stand this disulfide on the hub's monument. */
  const makeHome = (key: string) => {
    useGame.getState().setHome(key);
    close();
  };
  const pages = useMemo(() => readerPages(index, line), [index, line]);
  const startAt = () => {
    const wanted = pendingPage ?? lastPage.get(line);
    pendingPage = null;
    return Math.max(0, pages.findIndex((p) => p.id === wanted));
  };
  const [at, setAt] = useState(startAt);
  const [bond, setBond] = useState<Load<BondCard>>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const pane = useRef<HTMLDivElement>(null);
  const page = pages[Math.min(at, pages.length - 1)];
  const card = page?.kind === "class" ? classCard(index, page.id) : null;
  const lineCard = classCard(index, line);

  useEffect(() => {
    if (!page) return;
    lastPage.set(line, page.id);
    pane.current?.scrollTo({ top: 0 });
    if (page.kind !== "bond") return;
    let live = true;
    setBond({ state: "loading" });
    loadBond(base, page.id).then(
      (value) => { if (live) setBond({ state: "ready", value }); },
      (e: unknown) => { if (live) setBond({ state: "error", message: String((e as Error).message ?? e) }); },
    );
    return () => { live = false; };
  }, [base, line, page, attempt]);

  // Left and Right turn to the previous or next page; Up and Down scroll.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        if (e.repeat) return;
        const next = at + (e.code === "ArrowLeft" ? -1 : 1);
        if (next >= 0 && next < pages.length) setAt(next);
        e.preventDefault();
      } else if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        const p = pane.current;
        if (p) p.scrollBy({ top: (e.code === "ArrowUp" ? -1 : 1) * p.clientHeight * 0.4, behavior: "smooth" });
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, pages.length]);

  /** Turn to a class or bond: on this tree, its page; on another, that tree. */
  const visit = (id: string) => {
    const here = pages.findIndex((p) => p.id === id);
    if (here >= 0) { setAt(here); return; }
    const other = index.lineOf.get(id);
    if (other) { pendingPage = id; useGame.getState().openReader(other); }
  };

  // The last bond fetched, while it is still this page's: a turn to another bond shows nothing stale.
  const shown = page?.kind === "bond" && bond.state === "ready" && bond.value.key === page.id ? bond.value : null;
  const title = !page ? line : card ? card.title : shown ? bondName(shown) : page.id;
  const path = page ? trail(index, page.id) : [];

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-bg/60 p-2 sm:p-6" onClick={close}>
      <article role="dialog" aria-modal="true" aria-labelledby="reader-title"
        className="flex h-[92dvh] w-full max-w-3xl flex-col rounded-xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start gap-3 border-b border-border p-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs tracking-wide text-muted uppercase">
              {!lineCard ? line : lineCard.family === lineCard.title ? lineCard.title : `${lineCard.family} · ${lineCard.title}`}
              {card && card.level !== "binary" ? ` · ${levelName(card.level)}` : page?.kind === "bond" ? " · Sampled bond" : ""}
            </p>
            <h2 id="reader-title" className="font-display text-2xl leading-tight lining-nums sm:text-3xl">{title}</h2>
            {path.length > 1 ? (
              <p className="text-sm text-muted">
                {path.map((id, i) => (
                  <span key={id}>
                    {i ? " > " : ""}
                    {id === page?.id ? id : <PageLink id={id} onVisit={visit} />}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          {shown ? (
            home === page.id ? (
              <p className="shrink-0 self-center text-xs text-muted">The home disulfide</p>
            ) : (
              <button type="button" onClick={() => makeHome(page.id)}
                className="min-h-11 shrink-0 self-center rounded-md border border-border px-3 text-sm text-primary">
                Make this the home disulfide
              </button>
            )
          ) : null}
          <button type="button" autoFocus onClick={close}
            className="grid size-11 shrink-0 place-items-center rounded-md text-muted" aria-label="Close the reader">
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </header>

        {pages.length > 1 ? (
          <label className="flex items-center gap-3 border-b border-border px-4 py-2 text-sm text-muted sm:px-6">
            Page
            <select value={Math.min(at, pages.length - 1)} onChange={(e) => setAt(Number(e.target.value))}
              className="min-w-0 flex-1 truncate rounded-md border border-border bg-bg p-2 text-fg">
              {pages.map((p, i) => (
                <option key={p.id} value={i}>
                  {"  ".repeat(p.depth)}{p.depth === 0 && lineCard ? lineCard.title : p.id}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div ref={pane} className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-10">
          {!page ? (
            <p className="text-sm text-muted">This tree has no pages.</p>
          ) : card ? (
            <ClassPage card={card} index={index} onVisit={visit} />
          ) : bond.state === "error" ? (
            <div className="grid gap-3 text-sm leading-relaxed text-muted">
              <p className="text-fg">The bond card could not be fetched: {bond.message}.</p>
              <p>The orchard reads each sampled bond from <code className="text-fg">bonds/&lt;key&gt;.json</code>; run <code className="text-fg">make forest</code>.</p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)}
                className="min-h-11 justify-self-start rounded-md bg-primary px-4 text-primary-fg">Try again</button>
            </div>
          ) : shown ? (
            <BondPage bond={shown} onVisit={visit} />
          ) : (
            <p className="text-sm text-muted">Opening the bond card...</p>
          )}
        </div>

        {pages.length > 1 ? (
          <footer className="flex items-center justify-between gap-2 border-t border-border p-3 sm:px-6">
            <button type="button" disabled={at <= 0} onClick={() => setAt(at - 1)}
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm text-fg disabled:text-faint">
              <ChevronLeft className="size-4" strokeWidth={1.75} /> Previous
            </button>
            <span className="text-xs text-muted tabular-nums">{Math.min(at, pages.length - 1) + 1} of {pages.length}</span>
            <button type="button" disabled={at >= pages.length - 1} onClick={() => setAt(at + 1)}
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm text-fg disabled:text-faint">
              Next <ChevronRight className="size-4" strokeWidth={1.75} />
            </button>
          </footer>
        ) : null}
      </article>
    </div>
  );
}
