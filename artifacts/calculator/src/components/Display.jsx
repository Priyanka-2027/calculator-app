/**
 * Display.jsx — Memoized calculator screen
 *
 * Wrapped in React.memo so it only re-renders when its props change.
 *
 * aria-live="polite" on the result element means screen readers will
 * announce the new value after each calculation without interrupting
 * whatever the user was reading.
 *
 * Props:
 *   expression : string — dim top line (e.g. "2+5*8-9/3 =")
 *   input      : string — large bottom line (current number or result)
 *   pop        : bool   — when true, plays the result-pop keyframe animation
 */
import { memo } from "react";

function Display({ expression, input, pop = false }) {
  return (
    <div className="calc-display" role="region" aria-label="Calculator display">
      {/* Previous expression — decorative, not announced */}
      <div className="calc-display__expression" aria-hidden="true">
        {expression || "\u00A0"}
      </div>

      {/* Current value — announced when it changes */}
      <div
        className={[
          "calc-display__input",
          pop ? "calc-display__input--pop" : "calc-display__input--slide",
        ].join(" ")}
        aria-live="polite"
        aria-atomic="true"
        style={{
          fontSize:
            input.length > 14
              ? "1.5rem"
              : input.length > 10
              ? "2rem"
              : undefined,
        }}
      >
        {input || "0"}
      </div>
    </div>
  );
}

export default memo(Display);
