/**
 * routes/index.ts -- Central router
 * All sub-routers are registered here and mounted under /api in app.ts.
 */
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import calculatorRouter from "./calculator";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);      // GET  /api/healthz
router.use(calculatorRouter);  // POST /api/calculator
router.use(historyRouter);     // GET  /api/history  |  DELETE /api/history

export default router;
