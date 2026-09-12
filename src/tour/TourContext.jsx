import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import useTourState from "../hooks/useTourState";
import { TOURS } from "./steps";

/**
 * Runs one tour at a time and keeps it honest about what is actually on screen.
 *
 * Anchors are found by `data-tour` attribute rather than by refs: the targets sit
 * in five components three levels apart, two of them inside overlays that mount
 * and unmount, and threading a ref through all of that would put tour plumbing
 * into every prop list. `querySelector` also takes the first match in document
 * order for free, which is exactly the Monday-breakfast button and the first
 * recipe card, so the attribute can go on every instance unconditionally.
 */

const TourContext = createContext(null);

const TICK_MS = 120;
/** A target this late is a target the user navigated away from: drop the step. */
const MISSING_GRACE_MS = 400;

const findTarget = (name) => (name ? document.querySelector(`[data-tour="${name}"]`) : null);

export function TourProvider({ children }) {
  const { seen, ready, markSeen } = useTourState();
  const [active, setActive] = useState(null);
  const [queue, setQueue] = useState([]);
  const [target, setTarget] = useState(null);

  const activeRef = useRef(active);
  activeRef.current = active;
  /** Whether the running tour has managed to put a single bubble on screen. */
  const shownRef = useRef(false);

  const steps = active ? TOURS[active.tourId] : null;
  const step = steps ? steps[active.index] : null;

  const finish = useCallback((dismissed) => {
    const current = activeRef.current;
    if (!current) return;
    // A tour that fell through every missing anchor taught nothing, so it is not
    // spent: the user navigated before it could start, and it gets another turn.
    if (dismissed || shownRef.current) markSeen(current.tourId);
    setActive(null);
  }, [markSeen]);

  const advance = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    const list = TOURS[current.tourId];
    if (current.index + 1 < list.length) {
      setActive({ tourId: current.tourId, index: current.index + 1 });
      return;
    }
    finish(false);
  }, [finish]);

  const stop = useCallback(() => finish(true), [finish]);

  const begin = useCallback((tourId) => {
    shownRef.current = false;
    setActive({ tourId, index: 0 });
  }, []);

  /** Requests are queued, never overlapped: two bubbles at once teach nothing. */
  const requestTour = useCallback((tourId) => {
    setQueue((prev) => (prev.includes(tourId) ? prev : [...prev, tourId]));
  }, []);

  /**
   * The replay button: deliberate, so a tour already seen still plays, and it
   * starts with whatever is on screen — replaying from inside a recipe should
   * pick up at the tag steps rather than insist on the list first. It reports
   * failure only when the tour has nothing to point at at all, so the caller can
   * send the user somewhere it does make sense.
   */
  const startTour = useCallback((tourId) => {
    const list = TOURS[tourId];
    if (!list?.some((item) => findTarget(item.target))) return false;
    setQueue([]);
    begin(tourId);
    return true;
  }, [begin]);

  useEffect(() => {
    if (active || !queue.length || !ready) return undefined;

    // A queued tour waits for its opening anchor rather than starting against a
    // screen that has moved on. Switching tabs while one runs used to hand the
    // next one a page with none of its anchors, and it raced through every step
    // in silence before the user got there.
    let done = false;
    const tryStart = () => {
      if (done) return;
      // Any queued tour may start, not just the first: one waiting for a tab the
      // user has left — the shopping list is empty until the plan is not — would
      // otherwise hold up the tour for the tab in front of them.
      const pending = queue.filter((id) => !seen[id] && TOURS[id]?.length);
      const ripe = pending.find((id) => findTarget(TOURS[id][0].target));
      if (!ripe) {
        if (pending.length !== queue.length) {
          done = true;
          setQueue(pending);
        }
        return;
      }
      done = true;
      setQueue(pending.filter((id) => id !== ripe));
      begin(ripe);
    };

    tryStart();
    const timer = setInterval(tryStart, TICK_MS);
    return () => clearInterval(timer);
  }, [active, queue, ready, seen, begin]);

  useEffect(() => {
    if (!step) {
      setTarget(null);
      return undefined;
    }

    // Polling beats a MutationObserver here: the same loop has to notice an
    // anchor appearing, an anchor going away, and the next anchor arriving.
    const awaited = step.advance === "appear" ? steps[active.index + 1]?.target : null;
    // "Appeared" means appeared *since this step began*. An anchor that was there
    // all along — the picker remembering products from last time, the user already
    // sitting on the recipes tab — used to skip the very bubble explaining how to
    // get to it.
    let awaitedWasThere = Boolean(awaited && findTarget(awaited));
    let missingFor = 0;
    let finished = false;

    const tick = () => {
      if (finished) return;
      if (awaited) {
        const there = Boolean(findTarget(awaited));
        if (there && !awaitedWasThere) {
          finished = true;
          advance();
          return;
        }
        if (!there) awaitedWasThere = false;
      }
      const element = findTarget(step.target);
      if (element) {
        missingFor = 0;
        shownRef.current = true;
        setTarget((prev) => (prev === element ? prev : element));
        return;
      }
      setTarget(null);
      missingFor += TICK_MS;
      if (missingFor >= MISSING_GRACE_MS) {
        finished = true;
        advance();
      }
    };

    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [step, steps, active, advance]);

  const value = useMemo(() => ({
    tourId: active?.tourId || null,
    step,
    target,
    stepNumber: active ? active.index + 1 : 0,
    stepCount: steps?.length || 0,
    next: advance,
    skip: stop,
    startTour,
    requestTour,
  }), [active, step, target, steps, advance, stop, startTour, requestTour]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error("useTour must be used inside <TourProvider>");
  return context;
}
