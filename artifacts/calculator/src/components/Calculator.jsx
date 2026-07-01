/**
 * Calculator.jsx — State, logic, keyboard support, and UI
 *
 * State machine:
 *   expression  — what the user has typed (e.g. "(2+5)*8-9/3")
 *   prevLine    — dimmed top line showing the evaluated expression after "="
 *   hasResult   — true right after "=" so the next digit starts fresh
 *   loading     — true while waiting for server evaluation
 *   activeKey   — button label currently "pressed" via keyboard (flash effect)
 *   resultPop   — true for 300 ms after a result arrives (display animation)
 *
 * Keyboard mapping:
 *   0-9 .        → digit / decimal
 *   + - * /      → operator (/ prevents browser quick-find)
 *   % ( )        → modulo / parens
 *   Enter or =   → equals
 *   Backspace    → delete last char
 *   Delete / Esc → clear (AC)
 *
 * Performance:
 *   - All handlers are stable useCallback references.
 *   - handleDigit avoids closing over `expression` by using the state-updater
 *     pattern — it only re-creates when `loading` or `hasResult` change.
 *   - Button and Display are React.memo'd, so only the button whose `pressed`
 *     prop changed actually re-renders on keypress.
 *   - The resultPop timeout is cleaned up in a useEffect so there is no
 *     state update on an unmounted component.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useCalculate, getGetHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Display from "./Display";
import Button from "./Button";

// Button layout — 4 columns; the third element is the accessible aria-label
const BUTTONS = [
  ["(",  "paren",       "open parenthesis"],
  [")",  "paren",       "close parenthesis"],
  ["AC", "clear",       "clear all"],
  ["DEL","clear",       "delete"],
  ["7",  "number",      "7"],
  ["8",  "number",      "8"],
  ["9",  "number",      "9"],
  ["÷",  "operator",    "divide"],
  ["4",  "number",      "4"],
  ["5",  "number",      "5"],
  ["6",  "number",      "6"],
  ["×",  "operator",    "multiply"],
  ["1",  "number",      "1"],
  ["2",  "number",      "2"],
  ["3",  "number",      "3"],
  ["-",  "operator",    "subtract"],
  ["%",  "operator",    "modulo"],
  ["0",  "number",      "0"],
  [".",  "number",      "decimal point"],
  ["+",  "operator",    "add"],
  ["=",  "equals-wide", "equals"],
];

// Map display symbols to real math operators for the backend parser
function toMathExpr(expr) {
  return expr.replaceAll("÷", "/").replaceAll("×", "*");
}

function endsWithOperator(s) {
  return /[+\-*/÷×%]$/.test(s.trimEnd());
}

function Calculator() {
  const [expression, setExpression] = useState("");
  const [prevLine,   setPrevLine]   = useState("");
  const [hasResult,  setHasResult]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [activeKey,  setActiveKey]  = useState(null);
  const [resultPop,  setResultPop]  = useState(false);

  // Refs for values needed inside callbacks without adding them to dep arrays
  const loadingRef   = useRef(loading);
  const hasResultRef = useRef(hasResult);
  useEffect(() => { loadingRef.current   = loading;   }, [loading]);
  useEffect(() => { hasResultRef.current = hasResult; }, [hasResult]);

  // Clean up the resultPop timer when the component unmounts
  useEffect(() => {
    if (!resultPop) return;
    const id = setTimeout(() => setResultPop(false), 300);
    return () => clearTimeout(id);
  }, [resultPop]);

  const queryClient       = useQueryClient();
  const calculateMutation = useCalculate();

  // ── Digit ─────────────────────────────────────────────────────
  const handleDigit = useCallback((digit) => {
    if (loadingRef.current) return;
    if (hasResultRef.current) {
      setExpression(digit);
      setPrevLine("");
      setHasResult(false);
      return;
    }
    // Use the updater pattern so we do not close over `expression`
    setExpression((prev) => (prev === "0" ? digit : prev + digit));
  }, []); // stable — reads live values via refs

  // ── Decimal ───────────────────────────────────────────────────
  const handleDecimal = useCallback(() => {
    if (loadingRef.current) return;
    if (hasResultRef.current) {
      setExpression("0.");
      setPrevLine("");
      setHasResult(false);
      return;
    }
    setExpression((prev) => {
      const lastSegment = prev.split(/[+\-*/÷×%()]/).pop() ?? "";
      if (lastSegment.includes(".")) return prev; // already has decimal
      const needsPrefix =
        prev === "" || endsWithOperator(prev) || prev.trimEnd().endsWith("(");
      return prev + (needsPrefix ? "0." : ".");
    });
  }, []);

  // ── Operator ──────────────────────────────────────────────────
  const handleOperator = useCallback((op) => {
    if (loadingRef.current) return;
    if (hasResultRef.current) setHasResult(false);
    setExpression((prev) => {
      if (prev === "" && op !== "-") return prev;
      if (endsWithOperator(prev)) return prev.trimEnd().slice(0, -1) + op;
      return prev + op;
    });
  }, []);

  // ── Parenthesis ───────────────────────────────────────────────
  const handleParen = useCallback((paren) => {
    if (loadingRef.current) return;
    if (hasResultRef.current) {
      setExpression(paren);
      setPrevLine("");
      setHasResult(false);
      return;
    }
    setExpression((prev) => prev + paren);
  }, []);

  // ── Clear (AC) ────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setExpression("");
    setPrevLine("");
    setHasResult(false);
    setLoading(false);
    setResultPop(false);
  }, []);

  // ── Delete (backspace) ────────────────────────────────────────
  const handleDelete = useCallback(() => {
    if (loadingRef.current) return;
    if (hasResultRef.current) { handleClear(); return; }
    setExpression((prev) => (prev.length > 1 ? prev.slice(0, -1) : ""));
  }, [handleClear]);

  // ── Equals → backend call ────────────────────────────────────
  const handleEquals = useCallback(() => {
    if (loadingRef.current) return;
    // Capture current expression synchronously via the setter pattern
    setExpression((currentExpr) => {
      if (!currentExpr) return currentExpr;

      const mathExpr = toMathExpr(currentExpr);
      setLoading(true);

      calculateMutation.mutate(
        { data: { expression: mathExpr } },
        {
          onSuccess: (data) => {
            const clean = parseFloat(data.result.toFixed(10)).toString();
            setPrevLine(currentExpr + " =");
            setExpression(clean);
            setHasResult(true);
            setLoading(false);
            setResultPop(true); // useEffect will clear it after 300 ms
            queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
          },
          onError: (err) => {
            const msg = err?.response?.data?.error ?? "Error";
            setPrevLine(currentExpr);
            setExpression(msg);
            setHasResult(true);
            setLoading(false);
          },
        },
      );

      return currentExpr; // leave expression unchanged until result arrives
    });
  }, [calculateMutation, queryClient]);

  // ── Central button dispatcher ─────────────────────────────────
  const handlePress = useCallback((label) => {
    switch (label) {
      case "AC":  return handleClear();
      case "DEL": return handleDelete();
      case "=":   return handleEquals();
      case ".":   return handleDecimal();
      case "(":
      case ")":   return handleParen(label);
      case "÷":
      case "×":
      case "-":
      case "+":
      case "%":   return handleOperator(label);
      default:    return handleDigit(label);
    }
  }, [handleClear, handleDelete, handleEquals, handleDecimal, handleParen, handleOperator, handleDigit]);

  // ── Keyboard support ──────────────────────────────────────────
  useEffect(() => {
    const flashTimers = new Map();

    function flash(label) {
      clearTimeout(flashTimers.get(label));
      setActiveKey(label);
      flashTimers.set(label, setTimeout(() => setActiveKey(null), 140));
    }

    function onKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const k = e.key;

      if (k >= "0" && k <= "9")       { flash(k);   handleDigit(k);        }
      else if (k === ".")              { flash("."); handleDecimal();        }
      else if (k === "+")              { flash("+"); handleOperator("+");    }
      else if (k === "-")              { flash("-"); handleOperator("-");    }
      else if (k === "*")              { flash("×"); handleOperator("×");   }
      else if (k === "/") { e.preventDefault(); flash("÷"); handleOperator("÷"); }
      else if (k === "%")              { flash("%"); handleOperator("%");    }
      else if (k === "(")              { flash("("); handleParen("(");      }
      else if (k === ")")              { flash(")"); handleParen(")");      }
      else if (k === "Enter" || k === "=") { e.preventDefault(); flash("="); handleEquals(); }
      else if (k === "Backspace")      { flash("DEL"); handleDelete();      }
      else if (k === "Delete" || k === "Escape") { flash("AC"); handleClear(); }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      flashTimers.forEach(clearTimeout); // clean up all pending flash timers
    };
  }, [handleDigit, handleDecimal, handleOperator, handleParen, handleEquals, handleDelete, handleClear]);

  const displayMain = loading ? "…" : (expression || "0");

  return (
    // role="application" tells screen readers this is an interactive widget,
    // not a document — so they pass keyboard events through to our handler
    <div
      className={`calculator${loading ? " calculator--loading" : ""}`}
      role="application"
      aria-label="Calculator"
    >
      <Display expression={prevLine} input={displayMain} pop={resultPop} />

      <div className="calc-buttons" role="group" aria-label="Calculator buttons">
        {BUTTONS.map(([label, type, ariaLabel]) => (
          <Button
            key={label}
            label={label}
            type={type}
            ariaLabel={ariaLabel}
            pressed={activeKey === label}
            onClick={handlePress}
          />
        ))}
      </div>

      <p className="keyboard-hint" aria-hidden="true">
        <kbd>Enter</kbd> = &nbsp;|&nbsp;
        <kbd>Backspace</kbd> DEL &nbsp;|&nbsp;
        <kbd>Esc</kbd> AC
      </p>
    </div>
  );
}

export default Calculator;
