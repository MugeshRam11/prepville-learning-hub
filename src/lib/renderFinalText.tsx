/**
 * renderFinalText — PrepVille Canonical Mathematical Rendering Pipeline
 *
 * Single, unified pipeline for all mathematical and prose rendering across
 * student and administrator interfaces.
 *
 * CONTRACT:
 * - Pure LaTeX & Mixed Prose: Handled transparently
 * - Inline ($...$) & Display ($$...$$) math rendered via KaTeX
 * - Safe handling of untrusted input (no script injection / arbitrary HTML execution)
 * - Currency protection: \$50 or bare $50 are preserved as literal currency, never as broken equations
 * - Graceful fallback: Malformed LaTeX never crashes the player or exam screen
 * - LRU rendering cache for sub-millisecond exam re-renders
 */
import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  parseMixedProseAndMath,
  extractCanonicalAnswerText,
  normalizePureLatex,
  MathSegment
} from './canonicalMath';

/** LRU-ish cache so frequent re-renders of exam questions remain instantaneous */
const RENDER_CACHE = new Map<string, React.ReactNode>();
const CACHE_LIMIT = 1500;

const cacheGet = (key: string) => RENDER_CACHE.get(key);
const cacheSet = (key: string, value: React.ReactNode) => {
  if (RENDER_CACHE.size >= CACHE_LIMIT) {
    const firstKey = RENDER_CACHE.keys().next().value;
    if (firstKey !== undefined) RENDER_CACHE.delete(firstKey);
  }
  RENDER_CACHE.set(key, value);
};

/**
 * Render a single LaTeX string to HTML via KaTeX safely.
 * If KaTeX fails due to malformed input, it falls back to a clean styled code tag without crashing.
 */
export const renderKatexSafe = (
  latex: string,
  displayMode: boolean,
  key: string | number
): React.ReactNode => {
  const clean = normalizePureLatex(latex);
  if (!clean) return null;

  try {
    const html = katex.renderToString(clean, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false, // Security: untrusted inputs cannot execute arbitrary HTML
      errorColor: '#dc2626', // Tailored error highlight
    });

    return (
      <span
        key={key}
        className={displayMode ? "katex-rendered block my-2 text-center" : "katex-rendered inline-block align-middle mx-0.5"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (err) {
    // Graceful fallback for malformed LaTeX
    return (
      <code
        key={key}
        className="text-xs font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded border border-destructive/20 inline-block align-middle"
        title="Mathematical expression syntax warning"
      >
        {latex}
      </code>
    );
  }
};

/**
 * Formats a plain text string preserving newlines as <br />
 */
const renderPlainTextWithBreaks = (text: string, baseKey: string | number): React.ReactNode => {
  if (!text) return null;
  if (!text.includes('\n')) return <React.Fragment key={baseKey}>{text}</React.Fragment>;

  const lines = text.split('\n');
  return (
    <React.Fragment key={baseKey}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </React.Fragment>
  );
};

/**
 * Main parser and renderer for arbitrary content.
 */
export const renderFinalText = (input: unknown): React.ReactNode => {
  if (input === null || input === undefined) return null;

  try {
    // 1. Extract canonical string (resolving JSON, objects with {text, equations}, legacy tokens)
    const text = extractCanonicalAnswerText(input);
    if (!text) return null;

    // Check cache
    const cached = cacheGet(text);
    if (cached !== undefined) return cached;

    // 2. Parse into typed segments (prose, inline-math, display-math)
    const segments: MathSegment[] = parseMixedProseAndMath(text);

    if (segments.length === 0) {
      const node = renderPlainTextWithBreaks(text, 'single-text');
      cacheSet(text, node);
      return node;
    }

    // 3. Map each segment to safe React node
    const nodes: React.ReactNode[] = segments.map((seg, idx) => {
      if (seg.type === 'display-math') {
        return renderKatexSafe(seg.value, true, `disp-${idx}`);
      }
      if (seg.type === 'inline-math') {
        return renderKatexSafe(seg.value, false, `inline-${idx}`);
      }
      // Prose segment
      return renderPlainTextWithBreaks(seg.value, `txt-${idx}`);
    });

    const result = <>{nodes}</>;
    cacheSet(text, result);
    return result;
  } catch (err) {
    if (typeof console !== 'undefined' && import.meta.env?.DEV) {
      console.warn('[renderFinalText] unexpected render error:', err);
    }
    const fallback = typeof input === 'string' ? input : '';
    return <span>{fallback}</span>;
  }
};

export default renderFinalText;
