import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../contexts/UserDataContext";

/**
 * Which onboarding tours the user has already been through.
 *
 * Stored shape, identical in localStorage and in `users/{uid}.settings.tour`:
 *   { week: true, recipes: true, account: true }
 *
 * A flag is only ever written as `true` — "not seen" is the absence of a key.
 * That makes merging the account record with this browser's record a plain
 * union, and a union is the right answer here: a tour watched on a laptop must
 * not play again on a phone, and one watched before signing up must not play
 * again after. The browser copy is kept even for signed-in users, so the tour
 * also stays quiet after signing out.
 */

const STORAGE_KEY = "tour-seen";

function writeLocal(seen) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {
    /* private mode or a full quota: the tour replaying is not worth throwing over */
  }
}

function loadLocal() {
  if (typeof localStorage === "undefined") return {};
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored || typeof stored !== "object") return {};
    return Object.fromEntries(
      Object.entries(stored).filter(([, value]) => value === true),
    );
  } catch {
    return {};
  }
}

export default function useTourState() {
  const { loading: authLoading } = useAuth();
  const { uid, enabled, tour, saveTour } = useUserData();

  const [seen, setSeen] = useState(loadLocal);
  const [hydratedUid, setHydratedUid] = useState(null);

  const seenRef = useRef(seen);
  seenRef.current = seen;
  const persistedRef = useRef(JSON.stringify(seen));

  useEffect(() => {
    if (!enabled) {
      if (hydratedUid !== null) setHydratedUid(null);
      return;
    }
    if (!tour || hydratedUid === uid) return;

    // Values are only ever `true`, so the union is the merge and the key count
    // is the diff: more keys than the account has means this browser saw more.
    const union = { ...tour, ...seenRef.current };
    persistedRef.current = JSON.stringify(union);
    writeLocal(union);
    setSeen(union);
    setHydratedUid(uid);
    if (Object.keys(union).length !== Object.keys(tour).length) {
      saveTour(union).catch(() => {});
    }
  }, [enabled, uid, tour, hydratedUid, saveTour]);

  useEffect(() => {
    // Both effects run in the commit where the account record lands, and this one
    // would otherwise write the un-merged browser copy over it for a render.
    if (enabled && hydratedUid !== uid) return;

    const serialized = JSON.stringify(seen);
    if (serialized === persistedRef.current) return;
    persistedRef.current = serialized;
    writeLocal(seen);
    if (enabled) saveTour(seen).catch(() => {});
  }, [seen, enabled, uid, hydratedUid, saveTour]);

  const markSeen = useCallback((tourId) => {
    setSeen((prev) => (prev[tourId] ? prev : { ...prev, [tourId]: true }));
  }, []);

  // Starting a tour before the account record has arrived would show it to
  // someone who dismissed it on another device, so triggers wait for this.
  const ready = !authLoading && (!enabled || hydratedUid === uid);

  return { seen, ready, markSeen };
}
