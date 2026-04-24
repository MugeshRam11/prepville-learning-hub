/**
 * renderFinalText — the single, end-to-end pipeline for *every* piece of
 * user-facing text in the platform.
 *
 *      RAW (DB / AI / form input)
 *           │
 *           ▼
 *       extractDeep()         ← peel up to 3 layers of JSON / { text } / { value }
 *           │
 *           ▼
 *     cleanMathContent()      ← strip leaked HTML chips, entities, inline styles
 *           │
 *           ▼
 *     normalizeMath()         ← strip $/$$/\( \[ delimiters and convert
 *                               LaTeX commands inside them to Unicode glyphs
 *           │
 *           ▼
 *  React fragment with line breaks  ← NO KaTeX, NO math typesetting
 *
 * Result is plain Unicode text, safe to drop anywhere in JSX.
 */
import React from 'react';
import { cleanMathContent, normalizeMath } from './mathFormat';

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
      if (current.length === 1) {
        current = current[0];
        continue;
      }
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
      try {
        return JSON.stringify(current);
      } catch {
        return '';
      }
    }

    return String(current);
  }

  if (typeof current !== 'string') return '';

  return current
    .replace(/^\["|"\]$/g, '')
    .replace(/^\[|\]$/g, '')
    .replace(/^"|"$/g, '')
    .trim();
};

/** Tiny LRU-ish cache so re-renders of large exam papers stay cheap. */
const RENDER_CACHE = new Map<string, React.ReactNode>();
const CACHE_LIMIT = 1000;

const cacheGet = (key: string) => RENDER_CACHE.get(key);
const cacheSet = (key: string, value: React.ReactNode) => {
  if (RENDER_CACHE.size >= CACHE_LIMIT) {
    const firstKey = RENDER_CACHE.keys().next().value;
    if (firstKey !== undefined) RENDER_CACHE.delete(firstKey);
  }
  RENDER_CACHE.set(key, value);
};

/**
 * Convert a finished plain-text string into a React fragment that preserves
 * line breaks. We deliberately do NOT use `dangerouslySetInnerHTML` — the
 * output is text only.
 */
const textToFragment = (text: string): React.ReactNode => {
  if (!text) return null;
  if (!text.includes('\n')) return text;

  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {line}
          {idx < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </>
  );
};

/**
 * Public API — the only renderer the rest of the app should call.
 * Always returns a `React.ReactNode` (never throws) so it is safe to drop
 * directly into JSX without a wrapping try/catch.
 *
 * Output is plain Unicode text. No KaTeX, no math typesetting.
 */
export const renderFinalText = (input: unknown): React.ReactNode => {
  try {
    const display = extractDeep(input);
    if (!display) return null;

    const cleaned = cleanMathContent(display);
    if (!cleaned) return null;

    const normalised = normalizeMath(cleaned);
    if (!normalised) return null;

    const cached = cacheGet(normalised);
    if (cached !== undefined) return cached;

    const node = textToFragment(normalised);
    cacheSet(normalised, node);
    return node;
  } catch (err) {
    if (typeof console !== 'undefined' && import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[renderFinalText] failed to render input:', input, err);
    }
    const fallback = typeof input === 'string' ? input : '';
    return <span>{fallback}</span>;
  }
};

export default renderFinalText;
