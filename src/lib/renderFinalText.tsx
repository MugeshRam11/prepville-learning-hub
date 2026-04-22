/**
 * renderFinalText — the single, end-to-end pipeline for *every* piece of
 * user-facing text in the platform. This is the ONLY public renderer. The
 * underlying `renderLatexContent` is treated as private.
 *
 *      RAW (DB / AI / form input)
 *           │
 *           ▼
 *       extractDeep()      ← peel up to 3 layers of JSON / { text } / { value }
 *           │
 *           ▼
 *     cleanMathContent()   ← strip leaked HTML chips, entities, inline styles
 *           │
 *           ▼
 *      normalizeMath()     ← Unicode glyphs (½, √, π, ²) → LaTeX
 *           │
 *           ▼
 *    _renderLatexInternal  ← KaTeX + markdown + line breaks
 *           │
 *           ▼
 *          UI
 *
 * Cached per-input so re-renders of large exam papers stay cheap.
 */
import React from 'react';
import { cleanMathContent, normalizeMath } from './mathFormat';
import { renderLatexContent as _renderLatexInternal } from './renderLatex';

/**
 * Recursive extractor — handles up to 3 nested layers of JSON / object
 * wrappers. Real AI outputs occasionally look like
 *   "{\"value\":\"{\\\"text\\\":\\\"x^2\\\"}\"}"
 * which would defeat a single-pass parser.
 */
const extractDeep = (input: unknown): string => {
  let current: unknown = input;

  for (let i = 0; i < 3; i++) {
    if (current === null || current === undefined) return '';

    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          current = JSON.parse(trimmed);
          continue;
        } catch {
          /* not valid JSON — fall through and treat as plain text */
          break;
        }
      }
      break;
    }

    if (Array.isArray(current)) {
      if (current.length === 0) return '';
      // Single-element arrays are common AI artifacts: ["x^2"] → "x^2"
      if (current.length === 1) {
        current = current[0];
        continue;
      }
      // Multi-element arrays: join their textual forms.
      return current.map((item) => extractDeep(item)).filter(Boolean).join(' ');
    }

    if (typeof current === 'object') {
      const obj = current as Record<string, unknown>;
      if ('text' in obj) {
        current = obj.text;
        continue;
      }
      if ('value' in obj) {
        current = obj.value;
        continue;
      }
      // No known display field — bail out with JSON so we surface *something*.
      try {
        return JSON.stringify(current);
      } catch {
        return '';
      }
    }

    // numbers, booleans, etc.
    return String(current);
  }

  if (typeof current !== 'string') return '';

  // Strip lingering bracket / quote artifacts.
  return current
    .replace(/^\["|"\]$/g, '')
    .replace(/^\[|\]$/g, '')
    .replace(/^"|"$/g, '')
    .trim();
};

/**
 * Tiny LRU-ish cache. Pure function inputs ⇒ identical outputs, and React
 * re-renders the same exam page hundreds of times during a session.
 */
const RENDER_CACHE = new Map<string, React.ReactNode>();
const CACHE_LIMIT = 1000;

const cacheGet = (key: string) => RENDER_CACHE.get(key);
const cacheSet = (key: string, value: React.ReactNode) => {
  if (RENDER_CACHE.size >= CACHE_LIMIT) {
    // Drop the oldest entry (Map preserves insertion order).
    const firstKey = RENDER_CACHE.keys().next().value;
    if (firstKey !== undefined) RENDER_CACHE.delete(firstKey);
  }
  RENDER_CACHE.set(key, value);
};

/**
 * Public API — the only renderer the rest of the app should call.
 * Always returns a `React.ReactNode` (never throws) so it is safe to drop
 * directly into JSX without a wrapping try/catch.
 */
export const renderFinalText = (input: unknown): React.ReactNode => {
  try {
    const display = extractDeep(input);
    if (!display) return null;

    // Cache key uses the cleaned-but-not-rendered string so different raw
    // inputs that resolve to the same text share a cache slot.
    const cleaned = cleanMathContent(display);
    if (!cleaned) return null;
    const normalised = normalizeMath(cleaned);
    if (!normalised) return null;

    const cached = cacheGet(normalised);
    if (cached !== undefined) return cached;

    const node = _renderLatexInternal(normalised);
    cacheSet(normalised, node);
    return node;
  } catch (err) {
    // Surface failures during development; never crash the UI in production.
    if (typeof console !== 'undefined' && import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[renderFinalText] failed to render input:', input, err);
    }
    const fallback = typeof input === 'string' ? input : '';
    return <span>{fallback}</span>;
  }
};

export default renderFinalText;
