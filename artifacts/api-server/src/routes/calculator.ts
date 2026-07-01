/**
 * calculator.ts -- POST /api/calculator
 *
 * Evaluates a math expression using our Recursive Descent Parser,
 * then saves the result to the in-memory history store.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { evaluate } from "../lib/math-parser";
import { addEntry } from "../lib/history-store";

const router: IRouter = Router();

const MAX_EXPRESSION_LENGTH = 500; // guard against intentionally huge inputs

router.post("/calculator", (req: Request, res: Response) => {
  const { expression } = req.body as { expression?: unknown };

  if (!expression || typeof expression !== "string" || expression.trim() === "") {
    res.status(400).json({ error: "expression is required" });
    return;
  }

  if (expression.length > MAX_EXPRESSION_LENGTH) {
    res.status(400).json({
      error: `Expression too long (max ${MAX_EXPRESSION_LENGTH} characters)`,
    });
    return;
  }

  const trimmed = expression.trim();

  try {
    const raw = evaluate(trimmed);
    const result = parseFloat(raw.toFixed(10));

    addEntry(trimmed, result);

    req.log.info({ expression: trimmed, result }, "Calculation successful");
    res.json({ expression: trimmed, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not evaluate expression";
    req.log.warn({ expression: trimmed, error: message }, "Calculation failed");
    res.status(400).json({ error: message });
  }
});

export default router;
