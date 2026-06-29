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
 *     Split into prose + math segments
 *           │
 *           ▼
 *  Prose → plain text,  Math → KaTeX rendered inline
 */
import React from 'react';
import { cleanMathContent, stripLatexFormatting } from './mathFormat';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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
      if ('text' in obj) { current = obj.text; continue; }
      if ('value' in obj) { current = obj.value; continue; }
      try { return JSON.stringify(current); } catch { return ''; }
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
 * Render a LaTeX string to HTML via KaTeX, return as a span.
 * Falls back to inline code-style display on error.
 */
const renderKatex = (latex: string, displayMode: boolean, key: string | number): React.ReactNode => {
  try {
    const html = katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
    });
    return (
      <span
        key={key}
        className="katex-rendered"
        dangerouslySetInnerHTML={{ __html: html }}
        style={displayMode ? { display: 'block', textAlign: 'center', margin: '0.5em 0' } : undefined}
      />
    );
  } catch {
    return <code key={key} className="text-sm bg-muted px-1 rounded">{latex}</code>;
  }
};

/**
 * Split text into prose and math segments, render math with KaTeX.
 * Matches: $$...$$, $...$, \(...\), \[...\]
 */
const renderWithMath = (text: string): React.ReactNode => {
  const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = mathRegex.exec(text)) !== null) {
    // Add prose before this match
    if (match.index > lastIndex) {
      const prose = text.slice(lastIndex, match.index);
      parts.push(<React.Fragment key={idx++}>{prose}</React.Fragment>);
    }

    const raw = match[0];
    let latex: string;
    let displayMode = false;

    if (raw.startsWith('$$')) {
      latex = raw.slice(2, -2);
      displayMode = true;
    } else if (raw.startsWith('$')) {
      latex = raw.slice(1, -1);
    } else if (raw.startsWith('\\[')) {
      latex = raw.slice(2, -2);
      displayMode = true;
    } else {
      latex = raw.slice(2, -2);
    }

    parts.push(renderKatex(latex, displayMode, idx++));
    lastIndex = mathRegex.lastIndex;
  }

  // Remaining prose after last match
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    parts.push(<React.Fragment key={idx++}>{remaining}</React.Fragment>);
  }

  if (parts.length === 0) return text;
  return <>{parts}</>;
};

/**
 * Convert a finished string into a React fragment that preserves
 * line breaks and renders math expressions with KaTeX.
 */
const textToFragment = (text: string): React.ReactNode => {
  if (!text) return null;

  // Check if text contains any math delimiters
  const hasMath = /\$[^$]|\\\(|\\\[/.test(text);

  if (!hasMath) {
    if (!text.includes('\n')) return text;
    const lines = text.split('\n');
    return (
      <>
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </>
    );
  }

  // Has math — split by lines first, then render math within each line
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {renderWithMath(line)}
          {i < lines.length - 1 ? <br /> : null}
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
 * Math expressions ($...$, $$...$$, \(...\), \[...\]) are rendered with KaTeX.
 * Everything else is plain text.
 */
export const renderFinalText = (input: unknown): React.ReactNode => {
  try {
    const display = extractDeep(input);
    if (!display) return null;

    const cleaned = cleanMathContent(display);
    if (!cleaned) return null;

    const stripped = stripLatexFormatting(cleaned);
    if (!stripped) return null;

    const cached = cacheGet(stripped);
    if (cached !== undefined) return cached;

    const node = textToFragment(stripped);
    cacheSet(stripped, node);
    return node;
  } catch (err) {
    if (typeof console !== 'undefined' && import.meta.env?.DEV) {
      console.warn('[renderFinalText] failed to render input:', input, err);
    }
    const fallback = typeof input === 'string' ? input : '';
    return <span>{fallback}</span>;
  }
};

export default renderFinalText;
