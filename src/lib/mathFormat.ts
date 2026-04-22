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
