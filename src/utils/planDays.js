import { DAYS } from "../constants";

/**
 * The plan is a list of day blocks, `[{ id, date: "YYYY-MM-DD" }]`, in the order
 * the user arranged them. Cells are keyed by the block id (`${id}-${slot}`), not
 * by the date, so moving a block to another date keeps its dishes. The id is not
 * a weekday: the default blocks reuse `mon`…`fri` only so that plans saved
 * before blocks existed line up with them; the weekday shown comes from `date`.
 */

export const DEFAULT_PLAN_LENGTH = 5;

/** Ids end up in `${id}-${slot}` cell keys, so they must not contain a dash. */
const DAY_ID = /^[a-z0-9]+$/i;

const pad = (n) => String(n).padStart(2, "0");

export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of the date, or null for anything that is not a real calendar day. */
export function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toIsoDate(date) === iso ? date : null;
}

function addDays(date, count) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + count);
  return next;
}

export function shiftIsoDate(iso, count) {
  return toIsoDate(addDays(parseIsoDate(iso), count));
}

function mondayOf(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

/** `mon`…`sun` for the date, which is also the i18n key of its weekday. */
export function weekdayKey(iso) {
  return DAYS[(parseIsoDate(iso).getDay() + 6) % 7];
}

/** "ПН, 19 окт." */
export function dayLabel(iso, t, lang, separator = ", ") {
  const date = parseIsoDate(iso);
  const short = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(date);
  return `${t(`days.${weekdayKey(iso)}`)}${separator}${short}`;
}

export function newDayId() {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36)}`;
  return `d${random.replace(/[^a-z0-9]/gi, "").slice(0, 12)}`;
}

/** Monday to Friday of the week `today` falls in. */
export function defaultPlanDays(today = new Date()) {
  const monday = mondayOf(today);
  return DAYS.slice(0, DEFAULT_PLAN_LENGTH)
    .map((id, index) => ({ id, date: toIsoDate(addDays(monday, index)) }));
}

const cellDayId = (cell) => cell.slice(0, cell.indexOf("-"));

/**
 * Stored blocks when there are valid ones. Plans saved before blocks existed
 * keyed cells by weekday, so they get the default week — plus the weekend days
 * that actually hold dishes, which would otherwise vanish from the plan.
 */
export function normalizePlanDays(rawDays, weekPlan, today = new Date()) {
  if (Array.isArray(rawDays)) {
    const seen = new Set();
    const days = [];
    for (const day of rawDays) {
      if (!DAY_ID.test(day?.id) || seen.has(day.id) || !parseIsoDate(day.date)) continue;
      seen.add(day.id);
      days.push({ id: day.id, date: day.date });
    }
    if (days.length) return days;
  }

  const used = new Set(Object.keys(weekPlan || {}).map(cellDayId));
  const monday = mondayOf(today);
  return DAYS
    .map((id, index) => ({ id, date: toIsoDate(addDays(monday, index)) }))
    .filter((day, index) => index < DEFAULT_PLAN_LENGTH || used.has(day.id));
}

/**
 * Cells of a block that is no longer in the plan. They have to go rather than
 * merely stay hidden: the shopping list sums every cell it is given.
 */
export function dropOrphanCells(weekPlan, days) {
  const ids = new Set(days.map((day) => day.id));
  const cells = Object.keys(weekPlan || {});
  if (cells.every((cell) => ids.has(cellDayId(cell)))) return weekPlan;
  return Object.fromEntries(Object.entries(weekPlan).filter(([cell]) => ids.has(cellDayId(cell))));
}
