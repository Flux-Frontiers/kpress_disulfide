import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { lookAhead, setTouchAxes, setTouchLift, stickAxes } from "./input";
import { useGame } from "./store";

export function TouchControls() {
  const collect = useGame((s) => s.collect);
  const nearbySlug = useGame((s) => s.nearbySlug);
  const pressed = useGame((s) => (s.nearbySlug ? s.library.includes(s.nearbySlug) : false));
  const nearbyDist = useGame((s) => s.nearbyDist);
  const blocked = useGame((s) => s.paused || s.libraryOpen || s.atlasOpen || s.catalogOpen);
  const toggleCircuit = useGame((s) => s.toggleCircuit);
  const travelMode = useGame((s) => s.travelMode);
  const lookTurned = useGame((s) => s.lookTurned);

  useEffect(() => {
    setTouchAxes(0, 0);
    setTouchLift(0);
    return () => { setTouchAxes(0, 0); setTouchLift(0); };
  }, [blocked]);

  if (blocked) return null;
  return (
    <div className="touch-controls pointer-events-none absolute inset-x-0 bottom-0 z-20 items-end justify-between p-3">
      <Stick label="Drag to drive: up forward, down reverse, left or right to steer"
        onMove={(x, y) => { const a = stickAxes(x, y); setTouchAxes(a.throttle, a.steer); }}
        onRelease={() => setTouchAxes(0, 0)} />
      {/* No look stick: a drag anywhere else on the forest looks around (Player.tsx). */}
      {/* The view's own controls, on the right edge halfway up, clear of the
          search field and the cards at the bottom: R and F held raise or lower
          it, and Look ahead shows while it is turned. */}
      <div className="pointer-events-auto fixed top-1/2 right-3 flex -translate-y-1/2 flex-col items-end gap-2">
        <HoldButton label="Raise the view" lift={1}><ChevronUp className="size-5" /></HoldButton>
        <HoldButton label="Lower the view" lift={-1}><ChevronDown className="size-5" /></HoldButton>
        {lookTurned ? (
          <button type="button" className="min-h-11 rounded-full border border-border bg-surface px-3 text-xs" onClick={lookAhead}>
            Look ahead
          </button>
        ) : null}
      </div>
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <button type="button" className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm" onClick={toggleCircuit}>
          {travelMode === "circuit" ? "End tour" : "Guided tour"}
        </button>
        <button type="button" disabled={!nearbySlug || nearbyDist >= 6.8}
          className="min-h-14 min-w-14 rounded-full border border-border bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-40"
          onClick={() => { if (nearbySlug && nearbyDist < 6.8) collect(nearbySlug, "this line"); }}>
          {pressed ? "In album" : "Add"}
        </button>
      </div>
    </div>
  );
}

/** Raises or lowers the view while held, as R and F do. */
function HoldButton({ label, lift, children }: { label: string; lift: number; children: React.ReactNode }) {
  const stop = () => setTouchLift(0);
  return (
    <button type="button" aria-label={label}
      className="grid size-11 place-items-center rounded-full border border-border bg-surface touch-none select-none"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setTouchLift(lift); }}
      onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}>
      {children}
    </button>
  );
}

/**
 * A round thumb stick. `onMove` gets the thumb's position, x right and y down,
 * each -1..1 inside the ring with a small dead zone at the centre.
 */
function Stick({ label, onMove, onRelease }: {
  label: string;
  onMove: (x: number, y: number) => void;
  onRelease: () => void;
}) {
  const pid = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const releaseRef = useRef(onRelease);
  releaseRef.current = onRelease;

  // iOS can swallow the release (a touch taken over by an edge swipe, the app
  // backgrounded), which left the cart driving and the stick ignoring new
  // touches. Watch the window too: the owning pointer ending anywhere, every
  // finger lifting, or the page losing focus lets the stick go.
  useEffect(() => {
    const release = () => {
      if (pid.current === null) return;
      pid.current = null;
      releaseRef.current();
      setThumb({ x: 0, y: 0 });
    };
    const onPointerEnd = (e: PointerEvent) => { if (e.pointerId === pid.current) release(); };
    const onTouchEnd = (e: TouchEvent) => { if (e.touches.length === 0) release(); };
    const onHidden = () => { if (document.hidden) release(); };
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);

  function fromEvent(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width * 0.5);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height * 0.5);
    const mag = Math.hypot(dx, dy);
    const scale = mag > 1 ? 1 / mag : 1;
    const x = dx * scale, y = dy * scale;
    setThumb({ x: x * 32, y: y * 32 });
    onMove(Math.abs(x) < 0.12 ? 0 : x, Math.abs(y) < 0.12 ? 0 : y);
  }

  function clear(e: React.PointerEvent<HTMLDivElement>) {
    if (pid.current !== e.pointerId) return;
    pid.current = null;
    onRelease();
    setThumb({ x: 0, y: 0 });
  }

  return (
    <div role="group" aria-label={label}
      className="pointer-events-auto relative size-28 rounded-full border border-border bg-surface/80"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        // A new touch always takes the stick, so a release that never arrived cannot leave it dead.
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        fromEvent(e);
      }}
      onPointerMove={(e) => { if (pid.current === e.pointerId) fromEvent(e); }}
      onPointerUp={clear} onPointerCancel={clear} onLostPointerCapture={clear}>
      <span className="absolute inset-0 m-auto size-10 rounded-full border border-primary bg-primary/50"
        style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }} />
    </div>
  );
}
