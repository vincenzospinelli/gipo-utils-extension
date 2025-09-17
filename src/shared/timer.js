import {
  DEFAULT_TIMER_PRESETS,
  MAX_SESSION_HISTORY,
} from "./constants";

export const sanitizePresets = (value = DEFAULT_TIMER_PRESETS) => {
  if (!Array.isArray(value)) return [...DEFAULT_TIMER_PRESETS];
  const cleaned = value
    .map((item) => parseInt(item, 10))
    .filter((num) => Number.isFinite(num) && num > 0)
    .map((num) => Math.min(num, 24 * 60 * 60)) // cap at 24h in seconds
    .map((num) => Math.round(num));
  const unique = Array.from(new Set(cleaned));
  return unique.length ? unique.sort((a, b) => a - b) : [...DEFAULT_TIMER_PRESETS];
};

export const appendSessionHistory = (
  history = [],
  entry,
  maxSize = MAX_SESSION_HISTORY
) => {
  if (!entry) return Array.isArray(history) ? history : [];
  const base = Array.isArray(history) ? history.slice() : [];
  base.unshift(entry);
  if (maxSize > 0 && base.length > maxSize) {
    base.length = maxSize;
  }
  return base;
};

export const buildSessionEntry = ({
  personName,
  durationMs,
  startedAt,
  completed,
}) => ({
  personName,
  durationMs,
  startedAt,
  completed,
});

export const summarizeHistory = (history = []) => {
  const totals = new Map();
  history.forEach((entry) => {
    if (!entry?.personName || !Number.isFinite(entry.durationMs)) return;
    const current = totals.get(entry.personName) || 0;
    totals.set(entry.personName, current + Math.max(0, entry.durationMs));
  });
  return Array.from(totals.entries()).map(([personName, durationMs]) => ({
    personName,
    durationMs,
  }));
};
