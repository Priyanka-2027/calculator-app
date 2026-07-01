/**
 * math-parser.ts
 *
 * A hand-written Recursive Descent Parser for safe math expression evaluation.
 * No eval(), no vm, no third-party libraries -- pure TypeScript.
 *
 * Supports: + - * / %  parentheses ()  decimal numbers  unary minus
 * Operator precedence (low to high): + - < * / % < unary - < ( )
 *
 * -----------------------------------------------------------------
 * ALGORITHM OVERVIEW
 * -----------------------------------------------------------------
 *
 * Phase 1 -- TOKENIZER
 *   Scans the raw string character by character and produces a flat
 *   array of typed tokens:
 *     "2 + 5 * 8"  →  [NUM(2), PLUS, NUM(5), STAR, NUM(8), EOF]
 *
 * Phase 2 -- PARSER (three grammar rules, one per precedence level)
 *
 *   parseAddSub()         → handles +  and  -  (lowest priority)
 *     └─ parseMulDiv()    → handles *  /  %    (medium priority)
 *          └─ parsePrimary()  → handles numbers, unary -, and ( expr )
 *               └─ calls parseAddSub() recursively inside parentheses
 *
 *   The key insight: each rule calls the rule ABOVE it for its
 *   sub-expressions.  Because parseMulDiv is called before the + / -
 *   loop in parseAddSub can run, multiplication is always evaluated
 *   first -- operator precedence falls out of the call structure.
 *
 * Example trace for "2 + 5 * 8 - 9 / 3":
 *
 *   parseAddSub
 *     parseMulDiv → parsePrimary → 2       returns 2
 *     see '+', advance
 *     parseMulDiv
 *       parsePrimary → 5                   returns 5
 *       see '*', advance
 *       parsePrimary → 8
 *       returns 5 * 8 = 40
 *     left = 2 + 40 = 42
 *     see '-', advance
 *     parseMulDiv
 *       parsePrimary → 9
 *       see '/', advance
 *       parsePrimary → 3
 *       returns 9 / 3 = 3
 *     left = 42 - 3 = 39   ← correct!
 * -----------------------------------------------------------------
 */

// ── Token types ────────────────────────────────────────────────────────────────

type TokenKind =
  | "NUMBER"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "PERCENT"
  | "LPAREN"
  | "RPAREN"
  | "EOF";

interface Token {
  kind: TokenKind;
  value?: number; // only present for NUMBER tokens
}

// ── Phase 1: Tokenizer ─────────────────────────────────────────────────────────

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Skip whitespace
    if (ch === " " || ch === "\t") { i++; continue; }

    // Multi-character: read a full number (may contain one decimal point)
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let raw = "";
      let dotCount = 0;
      while (i < expr.length && ((expr[i] >= "0" && expr[i] <= "9") || expr[i] === ".")) {
        if (expr[i] === ".") {
          dotCount++;
          if (dotCount > 1) throw new Error("Invalid number: multiple decimal points");
        }
        raw += expr[i++];
      }
      const num = parseFloat(raw);
      if (Number.isNaN(num)) throw new Error(`Invalid number literal: "${raw}"`);
      tokens.push({ kind: "NUMBER", value: num });
      continue;
    }

    // Single-character tokens
    switch (ch) {
      case "+": tokens.push({ kind: "PLUS" });    break;
      case "-": tokens.push({ kind: "MINUS" });   break;
      case "*": tokens.push({ kind: "STAR" });    break;
      case "/": tokens.push({ kind: "SLASH" });   break;
      case "%": tokens.push({ kind: "PERCENT" }); break;
      case "(": tokens.push({ kind: "LPAREN" });  break;
      case ")": tokens.push({ kind: "RPAREN" });  break;
      default:
        throw new Error(`Unknown character: "${ch}"`);
    }
    i++;
  }

  tokens.push({ kind: "EOF" }); // sentinel — signals end of input
  return tokens;
}

// ── Phase 2: Parser ────────────────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // Look at the current token without consuming it
  private peek(): Token {
    return this.tokens[this.pos];
  }

  // Consume and return the current token
  private consume(): Token {
    return this.tokens[this.pos++];
  }

  /**
   * parseAddSub -- Grammar rule (lowest precedence)
   *
   *   addSub = mulDiv ( ( "+" | "-" ) mulDiv )*
   *
   * Reads a mulDiv operand, then keeps looping as long as the next
   * token is + or -.  Left-associative: 9 - 3 - 2 → (9-3)-2 = 4.
   */
  parseAddSub(): number {
    let left = this.parseMulDiv();

    while (this.peek().kind === "PLUS" || this.peek().kind === "MINUS") {
      const op = this.consume().kind;
      const right = this.parseMulDiv();
      left = op === "PLUS" ? left + right : left - right;
    }

    return left;
  }

  /**
   * parseMulDiv -- Grammar rule (medium precedence)
   *
   *   mulDiv = primary ( ( "*" | "/" | "%" ) primary )*
   *
   * Same loop pattern but for * / %.  Division by zero is caught here.
   */
  parseMulDiv(): number {
    let left = this.parsePrimary();

    while (
      this.peek().kind === "STAR" ||
      this.peek().kind === "SLASH" ||
      this.peek().kind === "PERCENT"
    ) {
      const op = this.consume().kind;
      const right = this.parsePrimary();

      if (op === "STAR") {
        left *= right;
      } else if (op === "SLASH") {
        if (right === 0) throw new Error("Division by zero");
        left /= right;
      } else {
        // PERCENT
        if (right === 0) throw new Error("Modulo by zero");
        left %= right;
      }
    }

    return left;
  }

  /**
   * parsePrimary -- Grammar rule (highest precedence)
   *
   *   primary = NUMBER
   *           | "+" primary          (unary plus, e.g. +5)
   *           | "-" primary          (unary minus, e.g. -5 or -(3+2))
   *           | "(" addSub ")"       (parenthesised sub-expression)
   *
   * Parentheses restart the entire parse from parseAddSub(), which is
   * exactly what gives them the highest effective precedence.
   */
  parsePrimary(): number {
    const token = this.peek();

    // Unary minus: consume "-" then parse the next primary with negation
    if (token.kind === "MINUS") {
      this.consume();
      return -this.parsePrimary();
    }

    // Unary plus: consume "+" then parse the next primary unchanged
    if (token.kind === "PLUS") {
      this.consume();
      return this.parsePrimary();
    }

    // Parenthesised expression: ( expr )
    if (token.kind === "LPAREN") {
      this.consume(); // consume "("
      const val = this.parseAddSub(); // parse inner expression from the top
      if (this.peek().kind !== "RPAREN") {
        throw new Error("Missing closing parenthesis ')'");
      }
      this.consume(); // consume ")"
      return val;
    }

    // Number literal
    if (token.kind === "NUMBER") {
      this.consume();
      return token.value!;
    }

    // Anything else is a syntax error
    if (token.kind === "EOF") {
      throw new Error("Unexpected end of expression");
    }
    throw new Error(`Unexpected token: "${token.kind}"`);
  }

  // The public entry point (called after construction)
  parse(): number {
    const result = this.parseAddSub();
    // After a valid expression there should be nothing left
    if (this.peek().kind !== "EOF") {
      throw new Error("Unexpected characters after expression");
    }
    return result;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * evaluate(expression)
 *
 * Tokenizes and parses a math expression string, returning the numeric result.
 * Throws a descriptive Error if the expression is malformed.
 *
 * @example
 *   evaluate("2 + 5 * 8 - 9 / 3")  // → 39
 *   evaluate("(2 + 5) * 8")         // → 56
 *   evaluate("-3 * (4 + 1)")        // → -15
 */
export function evaluate(expression: string): number {
  if (!expression || expression.trim() === "") {
    throw new Error("Expression is empty");
  }

  const tokens = tokenize(expression.trim());
  const parser = new Parser(tokens);
  const result = parser.parse();

  if (!Number.isFinite(result)) {
    throw new Error("Result is not a finite number");
  }

  return result;
}
