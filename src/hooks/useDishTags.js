import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUserData } from "../contexts/UserDataContext";
import { newEntryKey } from "../utils/planEntries";

/**
 * Personal tags: the shipped vocabulary deliberately says nothing about meals,
 * because everyone draws the line between breakfast, lunch and dinner somewhere
 * else. These tags live next to the catalog instead of inside it — marking a
 * shipped recipe as "my breakfast" must not create a recipe override, which
 * would drag the whole nutrition recompute along for a label change.
 *
 * Stored shape, identical in localStorage and in `users/{uid}.settings.dishTags`:
 *   { tags: [{ id, builtin?, label? }], assignments: { "recipe:<id>": ["my:breakfast"] } }
 *
 * `builtin` only means "label comes from i18n": the seeded four are a starting
 * point, not a fixed vocabulary, so they can be renamed and deleted like any other.
 */

const STORAGE_KEY = "dish-tags";
const SAVE_DEBOUNCE_MS = 600;

export const CUSTOM_TAG_PREFIX = "my:";

/** Seeded on first use: the four meals almost everyone starts from. */
const BUILTIN_TAGS = ["breakfast", "lunch", "dinner", "snack"];

export function dishTagKey(kind, id) {
  return `${kind}:${id}`;
}

export function isCustomTag(tagId) {
  return typeof tagId === "string" && tagId.startsWith(CUSTOM_TAG_PREFIX);
}

function seededState() {
  return {
    tags: BUILTIN_TAGS.map((builtin) => ({ id: `${CUSTOM_TAG_PREFIX}${builtin}`, builtin })),
    assignments: {},
  };
}

/** An absent record seeds the defaults; an explicitly empty tag list stays empty. */
function normalize(stored) {
  if (!stored || !Array.isArray(stored.tags)) return seededState();

  // A tag with neither a translation nor a typed name would render as an empty chip.
  const tags = stored.tags
    .filter((tag) => tag?.id && (tag.builtin || tag.label))
    .map((tag) => ({ id: tag.id, builtin: tag.builtin || null, label: tag.label || "" }));
  const known = new Set(tags.map((tag) => tag.id));

  const assignments = {};
  for (const [key, list] of Object.entries(stored.assignments || {})) {
    const kept = (Array.isArray(list) ? list : []).filter((tagId) => known.has(tagId));
    if (kept.length) assignments[key] = kept;
  }
  return { tags, assignments };
}

function loadLocal() {
  if (typeof localStorage === "undefined") return seededState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return seededState();
  }
}

export default function useDishTags() {
  const { t } = useTranslation();
  const { uid, enabled, dishTags, saveDishTags } = useUserData();

  const [state, setState] = useState(loadLocal);

  const hydratedUid = useRef(null);
  const persistedRef = useRef(null);
  const localRef = useRef(state);
  localRef.current = state;

  useEffect(() => {
    if (!enabled) {
      if (hydratedUid.current) {
        hydratedUid.current = null;
        persistedRef.current = null;
        setState(loadLocal());
      }
      return;
    }
    if (!dishTags || hydratedUid.current === uid) return;
    hydratedUid.current = uid;

    const stored = normalize(Object.keys(dishTags).length ? dishTags : null);
    // Tagging before signing up should carry over rather than be replaced by seeds:
    // own tags or assignments made while anonymous outrank an untouched account.
    // An empty tag list is never a seed, so it counts as a deliberate choice.
    const storedIsUntouched = stored.tags.length > 0
      && !Object.keys(stored.assignments).length
      && stored.tags.every((tag) => tag.builtin);
    const localHasWork = Object.keys(localRef.current.assignments).length
      || localRef.current.tags.some((tag) => !tag.builtin);
    if (storedIsUntouched && localHasWork) return;
    persistedRef.current = JSON.stringify(stored);
    setState(stored);
  }, [enabled, uid, dishTags]);

  useEffect(() => {
    const serialized = JSON.stringify(state);
    if (serialized === persistedRef.current) return undefined;

    if (!enabled) {
      persistedRef.current = serialized;
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, serialized);
      return undefined;
    }
    if (hydratedUid.current !== uid) return undefined;

    const timer = setTimeout(() => {
      persistedRef.current = serialized;
      saveDishTags(state).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, enabled, uid, saveDishTags]);

  const labelFor = (tagId) => {
    const tag = state.tags.find((item) => item.id === tagId);
    if (!tag) return tagId;
    return tag.builtin ? t(`dishTags.builtin.${tag.builtin}`) : tag.label;
  };

  const customTags = useMemo(
    () => state.tags.map((tag) => ({ ...tag, label: labelFor(tag.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tags, t],
  );

  const customTagIds = useMemo(() => state.tags.map((tag) => tag.id), [state.tags]);

  const tagsFor = (kind, id) => state.assignments[dishTagKey(kind, id)] || [];

  const toggleTag = (kind, id, tagId) => setState((prev) => {
    const key = dishTagKey(kind, id);
    const current = prev.assignments[key] || [];
    const next = current.includes(tagId)
      ? current.filter((item) => item !== tagId)
      : [...current, tagId];
    const assignments = { ...prev.assignments };
    if (next.length) assignments[key] = next;
    else delete assignments[key];
    return { ...prev, assignments };
  });

  const createTag = (label) => {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const id = `${CUSTOM_TAG_PREFIX}${newEntryKey()}`;
    setState((prev) => ({ ...prev, tags: [...prev.tags, { id, builtin: null, label: trimmed }] }));
    return id;
  };

  /**
   * Renaming a seeded tag drops its `builtin` marker: a name the user typed must
   * survive a language switch instead of falling back to the translation.
   * Assignments are keyed by tag id, so nothing has to be rewritten.
   */
  const renameTag = (tagId, label) => {
    const trimmed = label.trim();
    if (!trimmed) return false;
    setState((prev) => ({
      ...prev,
      tags: prev.tags.map((tag) => (
        tag.id === tagId ? { id: tag.id, builtin: null, label: trimmed } : tag
      )),
    }));
    return true;
  };

  const deleteTag = (tagId) => setState((prev) => {
    const assignments = {};
    for (const [key, list] of Object.entries(prev.assignments)) {
      const kept = list.filter((item) => item !== tagId);
      if (kept.length) assignments[key] = kept;
    }
    return { tags: prev.tags.filter((tag) => tag.id !== tagId), assignments };
  });

  return { customTags, customTagIds, labelFor, tagsFor, toggleTag, createTag, renameTag, deleteTag };
}
