/**
 * Plain-text math format utility.
 *
 * Goal: produce clean, human-readable Unicode text. NO LaTeX rendering, NO
 * KaTeX. Anything coming out of this module should be safe to drop into a
 * `<span>{text}</span>` and look right to a reader.
 *
 * Pipeline (consumed by `renderFinalText`):
 *   raw → cleanMathContent → stripLatexDelimiters → normalizeMath → text
 */

/**
 * Strip HTML wrappers that may have leaked from a rich-text editor. Math
 * chips like `<span data-latex="x^2"></span>` are unwrapped to their raw
 * latex string (delimiters removed downstream).
 */
export function cleanMathContent(text: string | null | undefined): string {
  if (!text) return '';

  let out = text;

  // 1. Unwrap math chips that carry the LaTeX in a data-* attribute.
  //    e.g. <span data-latex="x^2"></span>  →  x^2
  out = out.replace(
    /<(span|div)[^>]*data-(?:math-)?latex=(?:"([^"]*)"|'([^']*)')[^>]*>[\s\S]*?<\/\1>/gi,
    (_match, _tag, dq, sq) => {
      const latex = (dq ?? sq ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      return latex;
    }
  );

  // 2. Drop inline style/class attributes that often carry leaked colours.
  out = out.replace(/\sstyle\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\sclass\s*=\s*"[^"]*"/gi, '');

  // 3. Convert <br> to newlines so the renderer can preserve line breaks.
  out = out.replace(/<br\s*\/?>/gi, '\n');

  // 4. Strip any other HTML tags but keep their text content.
  out = out.replace(/<\/?(?:p|div|span|font|strong|b|em|i|u|sup|sub|ul|ol|li)[^>]*>/gi, '');

  // 5. Decode the most common HTML entities.
  out = out
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // 6. Remove leaked hex colour codes that occasionally appear as bare text.
  out = out.replace(/#[0-9A-Fa-f]{6}\b/g, '');

  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Strip cosmetic LaTeX formatting commands (color, bold, italic, etc.) that
 * commonly arrive when users paste from PDFs, coaching materials, or LaTeX
 * editors. We unwrap the inner content but discard the styling — our
 * pipeline is plain Unicode, not typeset math.
 *
 * Example:  $\color{#0000FF}{\textbf{Apply}}$  →  Apply
 *
 * Runs BEFORE normalizeMath so that downstream LaTeX→Unicode conversion
 * sees clean content. Idempotent.
 */
// Matches a {…} block where the content may itself contain one level of {…}.
// This lets us peel \color{spec}{\textbf{x}} in one pass of the outer regex,
// relying on the 4-iteration loop to handle deeper nesting.
const BRACE_CONTENT = '(?:[^{}]|\\{[^{}]*\\})*';

export function stripLatexFormatting(text: string | null | undefined): string {
  if (!text) return '';

  let out = text;

  // \color{spec}{content} → content   (spec may contain # or rgb(...))
  // Run repeatedly to peel nested wrappers like \color{#000}{\textbf{x}}.
  for (let i = 0; i < 4; i++) {
    const next = out
      .replace(new RegExp(`\\\\color\\s*\\{[^{}]*\\}\\s*\\{(${BRACE_CONTENT})\\}`, 'g'), '$1')
      .replace(new RegExp(`\\\\textcolor\\s*\\{[^{}]*\\}\\s*\\{(${BRACE_CONTENT})\\}`, 'g'), '$1')
      // Single-arg styling commands that wrap visible content.
      .replace(
        new RegExp(`\\\\(?:textbf|textit|textsf|texttt|textrm|emph|underline|mathbf|mathit|mathrm|mathsf|mathtt|boldsymbol|bm|operatorname)\\s*\\{(${BRACE_CONTENT})\\}`, 'g'),
        '$1'
      )
      // Size / spacing commands with no visible output.
      .replace(/\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b/g, '')
      .replace(/\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)\b/g, '')
      // Stray \left / \right size hints.
      .replace(/\\left\b/g, '')
      .replace(/\\right\b/g, '');
    if (next === out) break;
    out = next;
  }

  return out;
}

/**
 * Remove `$...$`, `$$...$$`, `\( ... \)`, and `\[ ... \]` wrappers, leaving
 * just the inner content. After this step the string contains no math
 * delimiters at all.
 */
export function stripLatexDelimiters(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]+?)\$/g, '$1')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1');
}

// ─────────────────────────────────────────────────────────────────────────
// LaTeX command → readable Unicode mappings (used by normalizeMath).
// We DO NOT convert Unicode → LaTeX. The whole point is to land in Unicode.
// ─────────────────────────────────────────────────────────────────────────

const LATEX_TO_UNICODE: Record<string, string> = {
  // Greek lowercase
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ',
  rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ',
  phi: 'φ', varphi: 'ϕ', chi: 'χ', psi: 'ψ', omega: 'ω',
  // Greek uppercase
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ',
  Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  // Operators / relations
  times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
  approx: '≈', equiv: '≡', sim: '∼', propto: '∝',
  infty: '∞', partial: '∂', nabla: '∇', forall: '∀', exists: '∃',
  emptyset: '∅', in: '∈', notin: '∉',
  subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇',
  cup: '∪', cap: '∩', wedge: '∧', vee: '∨', oplus: '⊕', otimes: '⊗',
  int: '∫', sum: '∑', prod: '∏',
  rightarrow: '→', to: '→', leftarrow: '←', leftrightarrow: '↔',
  Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔',
  ldots: '…', cdots: '⋯', dots: '…',
  // Common functions — keep readable
  sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
  log: 'log', ln: 'ln', exp: 'exp', lim: 'lim', max: 'max', min: 'min',
  // Spacing (just collapse to a single space)
  quad: ' ', qquad: '  ', ',': ' ', ';': ' ', ':': ' ', '!': '',
};

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ',
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
};

const toSuperscript = (s: string): string => {
  let out = '';
  for (const ch of s) {
    if (SUPERSCRIPT_DIGITS[ch]) {
      out += SUPERSCRIPT_DIGITS[ch];
    } else {
      // Fall back to caret notation when a character has no Unicode form.
      return `^${s.length > 1 ? `(${s})` : s}`;
    }
  }
  return out;
};

const toSubscript = (s: string): string => {
  let out = '';
  for (const ch of s) {
    if (SUBSCRIPT_DIGITS[ch]) {
      out += SUBSCRIPT_DIGITS[ch];
    } else {
      return `_${s.length > 1 ? `(${s})` : s}`;
    }
  }
  return out;
};

/**
 * Convert a LaTeX-ish string into clean Unicode plain text. Idempotent — if
 * the input already looks like prose it is returned almost untouched.
 */
function latexToReadable(input: string): string {
  let out = input;

  // \frac{a}{b} → a/b   (handle nested via repeated passes)
  for (let i = 0; i < 3; i++) {
    const replaced = out.replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)');
    if (replaced === out) break;
    out = replaced;
  }
  // Tidy: drop redundant parens around single tokens, e.g. (1)/(2) → 1/2
  out = out.replace(/\(([^()\s/]+)\)\/\(([^()\s/]+)\)/g, '$1/$2');

  // \sqrt{x} → √(x)  ;  \sqrt[n]{x} → ⁿ√(x) (best effort)
  out = out.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]+)\}/g, (_m, n, x) => `${n}√(${x})`);
  out = out.replace(/\\sqrt\s*\{([^{}]+)\}/g, (_m, x) => {
    return /^[A-Za-z0-9]+$/.test(x) ? `√${x}` : `√(${x})`;
  });

  // \text{...} / \mathrm{...} / \mathbf{...} → just the inner text
  out = out.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1');

  // ^{...} and _{...} → Unicode super/sub when possible
  out = out.replace(/\^\{([^{}]+)\}/g, (_m, g) => toSuperscript(g));
  out = out.replace(/_\{([^{}]+)\}/g, (_m, g) => toSubscript(g));
  // Single-char ^x / _x
  out = out.replace(/\^([A-Za-z0-9+\-=()])/g, (_m, g) => toSuperscript(g));
  out = out.replace(/_([A-Za-z0-9+\-=()])/g, (_m, g) => toSubscript(g));

  // \command → unicode (longest first so \varepsilon matches before \var…)
  // We swallow only an optional `{}` separator so `\pi r` keeps its space.
  const commandNames = Object.keys(LATEX_TO_UNICODE).sort((a, b) => b.length - a.length);
  for (const name of commandNames) {
    const sym = LATEX_TO_UNICODE[name];
    const re = new RegExp(`\\\\${name}(?![A-Za-z])(?:\\{\\})?`, 'g');
    out = out.replace(re, sym);
  }

  // Drop any remaining unknown \command tokens but keep their arguments.
  out = out.replace(/\\([A-Za-z]+)(?:\{\})?/g, '$1');

  // Collapse stray braces left over from LaTeX grouping.
  out = out.replace(/\{([^{}]*)\}/g, '$1');

  return out;
}

/**
 * Public entry: turn a (possibly LaTeX-laden) string into clean Unicode
 * prose. Strips all `$…$` / `$$…$$` / `\(…\)` / `\[…\]` delimiters and
 * converts the LaTeX inside them to readable Unicode.
 */
export function normalizeMath(text: string | null | undefined): string {
  if (!text) return '';

  // First, strip delimiters but remember which sections were math so we can
  // apply LaTeX→Unicode conversion only to those — prose stays untouched.
  const segments: Array<{ math: boolean; value: string }> = [];
  const re = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ math: false, value: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    let inner = raw;
    if (raw.startsWith('$$')) inner = raw.slice(2, -2);
    else if (raw.startsWith('$')) inner = raw.slice(1, -1);
    else if (raw.startsWith('\\(')) inner = raw.slice(2, -2);
    else if (raw.startsWith('\\[')) inner = raw.slice(2, -2);
    segments.push({ math: true, value: inner });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ math: false, value: text.slice(lastIndex) });
  }

  return segments
    .map((seg) => latexToReadable(seg.value))
    .join('')
    // Final tidy: convert any leftover \\ commands in prose too.
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ');
}

/**
 * Kept for backwards compatibility — same pipeline as `normalizeMath` but
 * trimmed and length-capped for sidebars / search.
 */
export function getPreviewText(text: string | null | undefined, maxLength = 80): string {
  const cleaned = cleanMathContent(text);
  if (!cleaned) return '';
  const stripped = stripLatexFormatting(cleaned);
  const plain = normalizeMath(stripped).replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Backwards-compat: previously returned LaTeX-ready text. Now returns the
 * fully readable Unicode form, since nothing in the app should be running
 * KaTeX anymore.
 */
export function getDisplayLatex(text: string | null | undefined): string {
  return normalizeMath(cleanMathContent(text));
}
