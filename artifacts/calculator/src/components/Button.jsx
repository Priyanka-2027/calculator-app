/**
 * Button.jsx — Memoized calculator button
 *
 * Wrapped in React.memo so that when Calculator re-renders (e.g. because
 * activeKey changed), only the one button whose `pressed` prop actually
 * changed will re-render. Without memo, all 21 buttons re-render on every
 * keystroke.
 *
 * Props:
 *   label     : string — text shown on the button
 *   ariaLabel : string — accessible label (e.g. "divide" instead of "÷")
 *   onClick   : func   — called with `label` when clicked
 *   type      : string — controls visual style variant
 *   pressed   : bool   — true when this button is active via keyboard
 */
import { memo } from "react";

function Button({ label, ariaLabel, onClick, type = "number", pressed = false }) {
  return (
    <button
      className={[
        "calc-button",
        `calc-button--${type}`,
        pressed ? "calc-button--pressed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onClick(label)}
      aria-label={ariaLabel ?? label}
      aria-pressed={pressed}
    >
      {label}
    </button>
  );
}

export default memo(Button);
