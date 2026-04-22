/**
 * Unified math format utility (Phase A of the dual-format plan).
 *
 * Source of truth = LaTeX (wrapped in $...$ / $$...$$ delimiters inside the
 * stored text). This module provides the small set of helpers used everywhere
 * to (a) clean dirty input that may have leaked HTML chips or styling, and
 * (b) derive lightweight previews for sidebars / search.
 *
 * For full math rendering, route the cleaned LaTeX text through
 * `renderLatexContent` from `@/lib/renderLatex`.
 */

/**
 * Strip HTML wrappers that may have leaked from a rich-text editor while
 * preserving any LaTeX they were carrying. Math chips like
 *   <span class="math-expression" data-latex="..."></span>
 * are unwrapped into $...$ so the renderer can pick them up.
 */
export function cleanMathContent(text: string | null | undefined): string {
  if (!text) return '';

  let out = text;

  // 1. Unwrap math chips that carry the LaTeX in a data-* attribute.
  //    e.g. <span data-latex="x^2"></span>  →  $x^2$
  //         <div  data-math-latex="..." data-display="block">…</div>  →  $$...$$
  out = out.replace(
    /<(span|div)[^>]*data-(?:math-)?latex=(?:"([^"]*)"|'([^']*)')[^>]*>[\s\S]*?<\/\1>/gi,
    (_match, _tag, dq, sq) => {
      const latex = (dq ?? sq ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const isBlock = /data-display=["']block["']/i.test(_match);
      return isBlock ? `$$${latex}$$` : `$${latex}$`;
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
 * Returns a math-aware string ready for `renderLatexContent`.
 * Equivalent to `cleanMathContent` today; kept as a separate name so callers
 * communicate intent ("I want the display LaTeX, not a preview").
 */
export function getDisplayLatex(text: string | null | undefined): string {
  return cleanMathContent(text);
}

/**
 * Convert standalone Unicode math glyphs into their LaTeX equivalents so
 * KaTeX can render them. Only touches text that is OUTSIDE existing math
 * delimiters (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`) — anything already inside
 * a math span is left untouched.
 *
 * Examples:
 *   ½     → $\frac{1}{2}$
 *   √x    → $\sqrt{x}$  (single token after the radical)
 *   π r²  → $\pi$ r²    (Greek letters become $...$)
 */
const VULGAR_FRACTIONS: Record<string, string> = {
  '½': '\\frac{1}{2}', '⅓': '\\frac{1}{3}', '⅔': '\\frac{2}{3}',
  '¼': '\\frac{1}{4}', '¾': '\\frac{3}{4}',
  '⅕': '\\frac{1}{5}', '⅖': '\\frac{2}{5}', '⅗': '\\frac{3}{5}', '⅘': '\\frac{4}{5}',
  '⅙': '\\frac{1}{6}', '⅚': '\\frac{5}{6}',
  '⅛': '\\frac{1}{8}', '⅜': '\\frac{3}{8}', '⅝': '\\frac{5}{8}', '⅞': '\\frac{7}{8}',
};

const GREEK_TO_LATEX: Record<string, string> = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\epsilon',
  'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'ι': '\\iota', 'κ': '\\kappa',
  'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi',
  'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi',
  'Π': '\\Pi', 'Σ': '\\Sigma', 'Υ': '\\Upsilon', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
};

const OPERATOR_TO_LATEX: Record<string, string> = {
  '∞': '\\infty', '∂': '\\partial', '∇': '\\nabla', '∀': '\\forall', '∃': '\\exists',
  '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '±': '\\pm', '∓': '\\mp',
  '×': '\\times', '÷': '\\div', '·': '\\cdot', '≈': '\\approx', '≡': '\\equiv',
  '∅': '\\emptyset', '∈': '\\in', '∉': '\\notin',
  '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '∪': '\\cup', '∩': '\\cap', '∧': '\\wedge', '∨': '\\vee',
  '⊕': '\\oplus', '⊗': '\\otimes', '∫': '\\int', '∑': '\\sum', '∏': '\\prod',
  '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
};

// Superscript / subscript Unicode → ASCII (we wrap the run in ^{} or _{}).
const SUPERSCRIPT_CHARS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')',
};
const SUBSCRIPT_CHARS: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
};

const SUP_KEYS = Object.keys(SUPERSCRIPT_CHARS).join('');
const SUB_KEYS = Object.keys(SUBSCRIPT_CHARS).join('');
const GREEK_KEYS = Object.keys(GREEK_TO_LATEX).join('');
const OP_KEYS = Object.keys(OPERATOR_TO_LATEX).join('');
const SQRT_GLYPH = '√';

// Any single character that signals "this run is math, not prose".
const MATH_GLYPH_CHAR = new RegExp(
  `[${SUP_KEYS}${SUB_KEYS}${GREEK_KEYS}${OP_KEYS}${SQRT_GLYPH}]|[${Object.keys(VULGAR_FRACTIONS).join('')}]`
);

// ASCII math signature — `x^2 + y^2 = r^2`, `f(x) = 3*x - 1`.
// To avoid wrapping prose like "I + you", require either:
//   • a `^` or `_` (unmistakable math indicator), OR
//   • a digit on at least one side of an operator.
const ASCII_MATH_HINT =
  /(?:[A-Za-z0-9)][\s]*[\^_][\s]*[A-Za-z0-9(])|(?:\d[\s]*[=+\-*/<>][\s]*[A-Za-z0-9(])|(?:[A-Za-z0-9)][\s]*[=+\-*/<>][\s]*\d)/;

/**
 * Convert a single character to its LaTeX equivalent (when called inside a
 * math run that we're about to wrap). Falls back to the character itself.
 *
 * Greek/operator commands need a trailing space before an alphanumeric so
 * KaTeX doesn't read `\pir` as one command.
 */
const charToLatex = (ch: string, nextCh?: string): string => {
  const cmd = GREEK_TO_LATEX[ch] || OPERATOR_TO_LATEX[ch];
  if (cmd) {
    return nextCh && /[A-Za-z0-9]/.test(nextCh) ? `${cmd} ` : cmd;
  }
  return ch;
};

/**
 * Walk a plain-text segment character-by-character. Whenever we hit a math
 * trigger, extend a "math run" greedily through adjacent identifier chars,
 * digits, simple operators, parentheses, sup/sub, Greek and operator glyphs.
 * Wrap the whole run once with `$...$`. This avoids `$\pi$r$^{2}$` fragments.
 */
const wrapMathTokens = (segment: string): string => {
  const isMathTrigger = (ch: string) =>
    !!GREEK_TO_LATEX[ch] || !!OPERATOR_TO_LATEX[ch] || !!SUPERSCRIPT_CHARS[ch] ||
    !!SUBSCRIPT_CHARS[ch] || ch === SQRT_GLYPH || !!VULGAR_FRACTIONS[ch];

  // A character may extend an already-open math run even if it wouldn't
  // start one (digits, identifiers, parens, dot).
  const extendsMathRun = (ch: string) =>
    isMathTrigger(ch) || /[A-Za-z0-9_().]/.test(ch);

  let out = '';
  let i = 0;
  const n = segment.length;

  while (i < n) {
    const ch = segment[i];

    if (!isMathTrigger(ch)) {
      out += ch;
      i++;
      continue;
    }

    // Walk BACK through immediately-preceding identifier/digit/paren chars so
    // that "x²" → `$x^{2}$` (not `x$^{2}$`) and "CO₂" → `$CO_{2}$`.
    let start = i;
    while (start > 0 && /[A-Za-z0-9_)]/.test(segment[start - 1])) {
      start--;
    }
    // If we walked back, drop the absorbed characters from `out`.
    const absorbed = i - start;
    if (absorbed > 0) {
      out = out.slice(0, out.length - absorbed);
    }

    // Walk forward to extend the run.
    let end = i + 1;
    while (end < n && extendsMathRun(segment[end])) {
      end++;
    }

    const raw = segment.slice(start, end);
    out += `$${transformMathRun(raw)}$`;
    i = end;
  }

  return out;
};

/**
 * Inside an already-wrapped math run, convert Unicode glyphs to LaTeX
 * commands and lift sup/sub characters into `^{…}` / `_{…}`.
 */
const transformMathRun = (run: string): string => {
  let out = '';
  let i = 0;
  while (i < run.length) {
    const ch = run[i];

    // Vulgar fraction → \frac{a}{b}
    if (VULGAR_FRACTIONS[ch]) {
      out += VULGAR_FRACTIONS[ch];
      i++;
      continue;
    }

    // √ followed by group / token → \sqrt{...}
    if (ch === SQRT_GLYPH) {
      const rest = run.slice(i + 1);
      const paren = rest.match(/^\s*\(([^)]+)\)/);
      if (paren) {
        out += `\\sqrt{${paren[1]}}`;
        i += 1 + paren[0].length;
        continue;
      }
      const tok = rest.match(/^\s*([A-Za-z0-9]+)/);
      if (tok) {
        out += `\\sqrt{${tok[1]}}`;
        i += 1 + tok[0].length;
        continue;
      }
      out += '\\sqrt{}';
      i++;
      continue;
    }

    // Run of superscript chars → ^{…}
    if (SUPERSCRIPT_CHARS[ch]) {
      let j = i;
      let ascii = '';
      while (j < run.length && SUPERSCRIPT_CHARS[run[j]]) {
        ascii += SUPERSCRIPT_CHARS[run[j]];
        j++;
      }
      out += `^{${ascii}}`;
      i = j;
      continue;
    }

    // Run of subscript chars → _{…}
    if (SUBSCRIPT_CHARS[ch]) {
      let j = i;
      let ascii = '';
      while (j < run.length && SUBSCRIPT_CHARS[run[j]]) {
        ascii += SUBSCRIPT_CHARS[run[j]];
        j++;
      }
      out += `_{${ascii}}`;
      i = j;
      continue;
    }

    out += charToLatex(ch);
    i++;
  }
  return out;
};

/**
 * Optional second pass: detect ASCII math expressions like
 *   x^2 + y^2 = r^2
 *   f(x) = 3*x - 1
 * and wrap the whole expression once. Skips text already inside `$...$`.
 */
const wrapAsciiMathRuns = (segment: string): string => {
  if (!ASCII_MATH_HINT.test(segment)) return segment;

  // Split on existing $...$ spans so we don't double-wrap.
  const parts = segment.split(/(\$[^$]+\$)/g);
  return parts
    .map((part) => {
      if (!part || (part.startsWith('$') && part.endsWith('$'))) return part;
      // Greedy expression: identifier/number → operator → identifier/number,
      // optionally repeated. Allows spaces, parens, dots.
      return part.replace(
        /([A-Za-z0-9_]+(?:\s*[\^_=+\-*/<>]\s*[A-Za-z0-9_().]+)+)/g,
        (m) => `$${m.replace(/\s+/g, ' ').trim()}$`
      );
    })
    .join('');
};

const normaliseSegment = (segment: string): string => {
  // Fast path: if there's no math glyph and no ASCII math signature, bail out.
  if (!MATH_GLYPH_CHAR.test(segment) && !ASCII_MATH_HINT.test(segment)) {
    return segment;
  }

  let out = wrapMathTokens(segment);
  out = wrapAsciiMathRuns(out);

  // Collapse adjacent inline math spans separated by only whitespace:
  //   `$a$ $b$` → `$a\;b$`  (keeps spacing inside math)
  out = out.replace(/\$([^$]+)\$\s+\$([^$]+)\$/g, (_, a, b) => `$${a}\\;${b}$`);

  return out;
};

export function normalizeMath(text: string | null | undefined): string {
  if (!text) return '';
  // Split on existing math spans so we never touch already-LaTeX content.
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$]+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
  return parts
    .map((part) => {
      if (!part) return '';
      if (
        (part.startsWith('$$') && part.endsWith('$$')) ||
        (part.startsWith('$') && part.endsWith('$') && part.length > 2) ||
        part.startsWith('\\(') ||
        part.startsWith('\\[')
      ) {
        return part;
      }
      return normaliseSegment(part);
    })
    .join('');
}

/**
 * Lightweight plain-text preview for sidebars, search results and tooltips.
 * Removes math delimiters and LaTeX commands so the output reads naturally
 * even without a math renderer.
 */
export function getPreviewText(text: string | null | undefined, maxLength = 80): string {
  const cleaned = cleanMathContent(text);
  if (!cleaned) return '';

  const plain = cleaned
    // Unwrap math delimiters but keep the inner expression for context.
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]+?)\$/g, '$1')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
    // Strip backslash commands (\frac, \sqrt, \ln, …) but keep their args.
    .replace(/\\[a-zA-Z]+\*?/g, '')
    // Drop the leftover braces from things like \frac{a}{b}.
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).trimEnd() + '…';
}
