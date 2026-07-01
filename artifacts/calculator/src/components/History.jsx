/**
 * History.jsx — Calculation history panel
 *
 * Fetches GET /api/history on mount and after every new calculation
 * (Calculator.jsx invalidates the query via React Query).
 *
 * Each entry shows:
 *   expression (dim, top)   result (bright, bottom)   time (right)
 *
 * "Clear History" calls DELETE /api/history then refetches.
 */

import { useGetHistory, useClearHistory } from "@workspace/api-client-react";

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatResult(num) {
  return parseFloat(num.toFixed(10)).toString();
}

function History() {
  const { data, isLoading, isError, refetch } = useGetHistory({
    query: { refetchInterval: false },
  });

  const clearMutation = useClearHistory();

  function handleClear() {
    clearMutation.mutate(undefined, {
      onSuccess: () => refetch(),
    });
  }

  const entries = data?.entries ?? [];

  return (
    <div className="history">
      <div className="history__header">
        <span className="history__title">History</span>
        {entries.length > 0 && (
          <button
            className="history__clear-btn"
            onClick={handleClear}
            disabled={clearMutation.isPending}
          >
            {clearMutation.isPending ? "Clearing…" : "Clear History"}
          </button>
        )}
      </div>

      {isLoading && <p className="history__empty">Loading…</p>}
      {isError   && <p className="history__empty history__empty--error">Could not load history.</p>}

      {!isLoading && !isError && entries.length === 0 && (
        <p className="history__empty">No calculations yet — try pressing =</p>
      )}

      {entries.length > 0 && (
        <ul className="history__list">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="history__item"
              /* Stagger each item's slide-in animation */
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="history__item-main">
                <span className="history__expression">{entry.expression}</span>
                <span className="history__result">= {formatResult(entry.result)}</span>
              </div>
              <span className="history__time">{formatTime(entry.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default History;
