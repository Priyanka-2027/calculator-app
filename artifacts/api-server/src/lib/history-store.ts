/**
 * history-store.ts
 *
 * Simple in-memory store for the last MAX_HISTORY calculations.
 * This is a singleton module -- the same `store` array is shared
 * across all requests for the lifetime of the server process.
 *
 * No database is used: history is intentionally ephemeral and resets
 * when the server restarts (as requested -- "in memory").
 */

const MAX_HISTORY = 20;

export interface HistoryEntry {
  id: string;         // unique id (timestamp-based)
  expression: string; // e.g. "2+5*8-9/3"
  result: number;     // e.g. 39
  timestamp: string;  // ISO 8601 string, e.g. "2024-01-15T10:30:00.000Z"
}

// The store -- private, mutated only through the functions below
const store: HistoryEntry[] = [];

/**
 * addEntry -- called after every successful calculation.
 * Inserts the new entry at the FRONT (newest first).
 * Trims to MAX_HISTORY if needed.
 */
export function addEntry(expression: string, result: number): HistoryEntry {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    expression,
    result,
    timestamp: new Date().toISOString(),
  };

  store.unshift(entry);                         // newest at index 0
  if (store.length > MAX_HISTORY) store.pop();  // drop the oldest if over limit

  return entry;
}

/** getHistory -- returns a shallow copy so callers cannot mutate the store */
export function getHistory(): HistoryEntry[] {
  return [...store];
}

/** clearHistory -- empties the store */
export function clearHistory(): void {
  store.length = 0;
}
