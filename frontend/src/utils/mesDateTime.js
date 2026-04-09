/**
 * Parse API datetimes stored as UTC in the DB but often serialized without a timezone.
 * `new Date("2026-04-08T14:00:00")` is treated as *local* time in JS → wrong duration vs `Date.now()`.
 * Appending `Z` forces UTC interpretation, matching the backend's datetime.utcnow semantics.
 *
 * @param {string | null | undefined} iso
 * @returns {Date | null}
 */
export function parseApiUtcDateTime(iso) {
  if (iso == null || iso === "") return null;
  const s = String(iso).trim();
  if (!s) return null;
  if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s);
  }
  const naive =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?$/.test(s);
  if (naive) {
    return new Date(`${s}Z`);
  }
  return new Date(s);
}

/**
 * Duration in minutes between two API timestamps (UTC-safe).
 * @param {string | null | undefined} startedAt
 * @param {string | null | undefined} endedAt - if null, uses `now`
 * @param {Date} [now] - for tests; default: current instant
 * @returns {number}
 */
export function durationMinutesApi(startedAt, endedAt, now = new Date()) {
  const start = parseApiUtcDateTime(startedAt);
  if (!start || Number.isNaN(start.getTime())) return 0;
  const end = endedAt ? parseApiUtcDateTime(endedAt) : now;
  if (!end || Number.isNaN(end.getTime())) return 0;
  return (end.getTime() - start.getTime()) / 1000 / 60;
}
