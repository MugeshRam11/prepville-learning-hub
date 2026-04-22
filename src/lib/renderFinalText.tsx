/**
 * renderFinalText — the single, end-to-end pipeline for *every* piece of
 * user-facing text in the platform.
 *
 *      RAW (DB / AI / form input)
 *           │
 *           ▼
 *    extractDisplayText()   ← strip JSON wrappers / pull `.text` / `.value`
 *           │
 *           ▼
 *     cleanMathContent()    ← normalise HTML chips, entities, leaked styles
 *           │              (this is the "normalizeMath" layer)
 *           ▼
 *    renderLatexContent()   ← KaTeX + markdown + line breaks
 *           │
 *           ▼
 *          UI
 *
 * Every component that displays text — question stems, sub-questions,
 * answer keys, Venn labels, AI feedback, mark schemes, evaluation panels —
 * MUST go through this single entry point. That guarantees identical
 * formatting across the entire app and is the only way to keep math /
 * Unicode / LaTeX rendering consistent.
 */
import React from 'react';
import { cleanMathContent } from './mathFormat';
import { renderLatexContent } from './renderLatex';

/**
 * Pull a displayable string out of whatever shape the caller hands us.
 * Handles the most common malformed inputs we see in production:
 *   • `null` / `undefined`               → ''
 *   • plain string                       → trimmed string
 *   • `{ text: '…' }` / `{ value: '…' }` → the inner field
 *   • stringified JSON wrapping any of the above
 *   • bracketed / quoted artifacts like `["x^2"]` or `"foo"`
 */
const extractDisplayText = (input: unknown): string => {
  if (input === null || input === undefined) return '';

  // Object → look for known display fields.
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.value === 'string') return obj.value;
    // Fall through to JSON.stringify so we at least surface something rather
    // than silently rendering "[object Object]".
    try {
      return JSON.stringify(input);
    } catch {
      return '';
    }
  }

  if (typeof input !== 'string') return String(input);

  let str = input;

  // Try parsing stringified JSON one level deep.
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.text === 'string') return obj.text;
        if (typeof obj.value === 'string') return obj.value;
        if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string') {
          str = parsed[0];
        }
      }
    } catch {
      /* not valid JSON — keep the raw string */
    }
  }

  // Strip lingering bracket / quote artifacts.
  return str
    .replace(/^\["|"\]$/g, '')
    .replace(/^\[|\]$/g, '')
    .replace(/^"|"$/g, '')
    .trim();
};

/**
 * Public API — the only renderer the rest of the app should call.
 * Always returns a `React.ReactNode` (never throws) so it is safe to drop
 * directly into JSX without a wrapping try/catch.
 */
export const renderFinalText = (input: unknown): React.ReactNode => {
  try {
    const display = extractDisplayText(input);
    if (!display) return null;
    const normalised = cleanMathContent(display);
    if (!normalised) return null;
    return renderLatexContent(normalised);
  } catch {
    // Last-resort fallback: render the raw string so the user still sees
    // *something* rather than a blank surface.
    const fallback = typeof input === 'string' ? input : '';
    return <span>{fallback}</span>;
  }
};

export default renderFinalText;
