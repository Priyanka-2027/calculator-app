import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Security headers (XSS, clickjacking, MIME sniffing, etc.) ───────────────
app.use(helmet());

// ── CORS: explicit allow-list (adjust origins for production) ────────────────
app.use(
  cors({
    origin: true, // reflect request origin in dev; tighten to a domain list in prod
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
  }),
);

// ── Rate limiting — prevents brute-force and resource exhaustion ─────────────
// Global limiter: 200 requests / 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests — please try again later." },
  }),
);

// Stricter limiter for the calculate endpoint: 60 req / min per IP
const calcLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many calculation requests — slow down." },
});
app.use("/api/calculator", calcLimiter);

// ── Structured request logging ───────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "16kb" })); // explicit body-size cap
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

export default app;
