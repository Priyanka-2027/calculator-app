# Code Calculator

A full-stack calculator web app built with **React + Vite** (frontend) and **Node.js + Express** (backend) in a **pnpm monorepo**.

Live demo: [code-calculator--priyankajakkam1.replit.app](https://code-calculator--priyankajakkam1.replit.app)

---

## Features

| Feature | Details |
|---------|---------|
| **Math operations** | Addition, subtraction, multiplication, division, modulo, parentheses |
| **Safe evaluation** | Hand-written recursive descent parser — no `eval()`, no external math libraries |
| **Calculation history** | Last 20 calculations stored in memory, shown in a live-updating panel |
| **Dark / Light mode** | CSS custom properties theme switch, preference saved to `localStorage` |
| **Keyboard support** | `0–9`, `+`, `-`, `*`, `/`, `%`, `(`, `)`, `Enter`, `Backspace`, `Delete`, `Esc` |
| **Animations** | Button press, result pop, history slide-in, theme transition |
| **Glassmorphism UI** | `backdrop-filter: blur` cards with semi-transparent backgrounds |
| **Responsive layout** | Adapts from 320 px phones to desktop |
| **Accessible** | `aria-live`, `aria-pressed`, `role="application"`, human-readable `aria-label` on every button |
| **Security** | Helmet headers, rate limiting, CORS, expression length cap, body size cap |

---

## Project Structure

```
.
├── artifacts/
│   ├── calculator/          # React + Vite frontend
│   │   └── src/
│   │       ├── App.jsx          # Root: theme state + layout
│   │       ├── App.css          # All styles (CSS custom properties)
│   │       └── components/
│   │           ├── Calculator.jsx   # State, keyboard, button grid
│   │           ├── Display.jsx      # Calculator screen
│   │           ├── Button.jsx       # Memoized button
│   │           └── History.jsx      # History panel
│   │
│   └── api-server/          # Express 5 backend
│       └── src/
│           ├── app.ts           # Express setup (helmet, cors, rate limiting)
│           ├── index.ts         # Server entry point
│           ├── routes/
│           │   ├── calculator.ts    # POST /api/calculator
│           │   └── history.ts       # GET / DELETE /api/history
│           └── lib/
│               ├── math-parser.ts   # Recursive descent parser
│               ├── history-store.ts # In-memory store (max 20)
│               └── logger.ts        # Pino logger singleton
│
├── lib/
│   ├── api-spec/            # OpenAPI spec (openapi.yaml)
│   ├── api-client-react/    # Generated React Query hooks (via Orval)
│   └── api-zod/             # Generated Zod schemas (via Orval)
│
├── pnpm-workspace.yaml      # Workspace config + package catalog
├── tsconfig.base.json       # Shared TypeScript strict defaults
└── package.json             # Root scripts
```

---

## Screenshots
<img width="712" height="448" alt="image" src="https://github.com/user-attachments/assets/11cdb00a-1c5c-4ff9-a65c-ddf8665eaa72" />
<img width="606" height="430" alt="image" src="https://github.com/user-attachments/assets/c51d9bc6-eee8-4156-a213-9308c9db0ee3" />


## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, CSS custom properties |
| State / Data | React Query (`@tanstack/react-query`) |
| API contract | OpenAPI 3.1 → Orval codegen (hooks + Zod schemas) |
| Backend | Node.js 24, Express 5, TypeScript |
| Validation | Zod (`zod/v4`), `drizzle-zod` |
| Logging | Pino + pino-http |
| Security | Helmet, express-rate-limit, CORS |
| Build | esbuild (server), Vite (client) |
| Package manager | pnpm workspaces |

---

## API Reference

### `POST /api/calculator`
Evaluate a math expression.

**Request**
```json
{ "expression": "2+5*8-9/3" }
```

**Response `200`**
```json
{ "expression": "2+5*8-9/3", "result": 39 }
```

**Response `400`**
```json
{ "error": "Division by zero" }
```

---

### `GET /api/history`
Returns the last 20 calculations, newest first.

**Response `200`**
```json
{
  "entries": [
    {
      "id": "1720000000000-abc12",
      "expression": "2+5*8-9/3",
      "result": 39,
      "timestamp": "2024-07-03T10:30:00.000Z"
    }
  ]
}
```

---

### `DELETE /api/history`
Clears all stored calculations.

**Response `204 No Content`**

---

### Rate Limits

| Scope | Limit |
|-------|-------|
| All `/api` routes | 200 requests / 15 min per IP |
| `/api/calculator` | 60 requests / 1 min per IP |
| Max expression length | 500 characters |
| Max request body | 16 KB |

---

## Running Locally

### Prerequisites

- **Node.js** 20 or later
- **pnpm** — `npm install -g pnpm`

### Install dependencies

```bash
pnpm install
```

### Start the API server

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Server starts at `http://localhost:8080` and auto-rebuilds on each `dev` run.

### Start the frontend

```bash
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/calculator run dev
```

Frontend starts at `http://localhost:3000`.

> The frontend calls `/api/...` — in Replit these are routed through a shared proxy automatically. Locally you may need to set up a proxy or update the Vite config to forward `/api` to port 8080.

### Regenerate API hooks (after changing the OpenAPI spec)

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Typecheck everything

```bash
pnpm run typecheck
```

---

## Math Parser

The backend evaluates expressions using a **hand-written recursive descent parser** — no `eval()`, no third-party math libraries.

```
Expression: "(2 + 5) * 8 - 9 / 3"

Phase 1 — Tokenizer
  "(2+5)*8-9/3" → [LPAREN, NUM(2), PLUS, NUM(5), RPAREN, STAR, NUM(8), ...]

Phase 2 — Parser (three grammar rules)
  parseAddSub()           ← lowest precedence (+ -)
    └─ parseMulDiv()      ← medium precedence (* / %)
         └─ parsePrimary() ← highest (numbers, unary -, parentheses)
```

**Supported:**
- `+` `-` `*` `/` `%`
- Parentheses `( )`
- Decimal numbers (`3.14`)
- Unary minus (`-5`, `-(3+2)`)
- Correct operator precedence (PEMDAS/BODMAS)

**Errors caught:**
- Division / modulo by zero
- Unmatched parentheses
- Unknown characters
- Empty expression
- Non-finite results

---

## Test Cases

| # | Input | Expected Output |
|---|-------|----------------|
| 1 | `5+3` | `8` |
| 2 | `10-4` | `6` |
| 3 | `6*7` | `42` |
| 4 | `15/4` | `3.75` |
| 5 | `8/0` | Error: Division by zero |
| 6 | `1.5+2.7` | `4.2` |
| 7 | `999999999*999999999` | `~10¹⁸` *(JS float precision)* |
| 8 | `-5+3` | `-2` |
| 9 | `5++3` | `8` *(unary plus on 3)* |
| 10 | `abc` | Error: Unknown character |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `0` – `9` | Digit |
| `.` | Decimal point |
| `+` `-` `*` | Operator |
| `/` | Divide (browser quick-find blocked) |
| `%` `(` `)` | Modulo / parentheses |
| `Enter` or `=` | Evaluate |
| `Backspace` | Delete last character |
| `Delete` or `Esc` | Clear all (AC) |

---

## Known Limitations

- **Large number precision** — JavaScript `number` (IEEE 754 64-bit float) loses precision above `2⁵³ − 1`. Inputs like `999999999 * 999999999` are slightly rounded. Fix: use `BigInt` or a decimal library like `Decimal.js`.
- **In-memory history** — History resets on server restart. For persistence, connect a PostgreSQL database using `pnpm --filter @workspace/db run push`.
- **No user accounts** — History is shared across all sessions (single-process, in-memory array).

---

## License

MIT
