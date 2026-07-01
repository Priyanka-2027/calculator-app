/**
 * history.ts
 *
 * GET  /api/history  -- returns the last 20 calculations (newest first)
 * DELETE /api/history  -- clears all stored calculations
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { getHistory, clearHistory } from "../lib/history-store";

const router: IRouter = Router();

// GET /api/history
router.get("/history", (_req: Request, res: Response) => {
  const entries = getHistory();
  res.json({ entries });
});

// DELETE /api/history
router.delete("/history", (_req: Request, res: Response) => {
  clearHistory();
  res.status(204).send();
});

export default router;
