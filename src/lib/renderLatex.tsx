import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cleanMathContent } from './mathFormat';

/**
 * ⚠️ INTERNAL — DO NOT IMPORT DIRECTLY ⚠️
 *
 * This module is the low-level KaTeX renderer. It is invoked exclusively by
 * `renderFinalText` (see `@/lib/renderFinalText`), which provides:
 *   • deep JSON / object extraction
 *   • HTML / chip cleaning
 *   • Unicode → LaTeX normalization
 *   • render-result caching
 *   • dev-only error logging
 *
 * Calling `renderLatexContent` directly bypasses all of that and silently
 * reintroduces formatting drift across the platform. Always use:
 *
 *     import { renderFinalText } from '@/lib/renderFinalText';
 *
 * Supports:
 * - HTML with data-latex / data-math-latex attributes
 * - \[...\] and $$...$$ block math
 * - \(...\) and $...$ inline math
 * - Markdown bold and line breaks
 *
 * Input is run through `cleanMathContent` first so any leaked HTML chips,
 * inline styles, or stray hex codes from upstream editors are stripped while
 * the underlying LaTeX is preserved.
 */

// Pre-process \(...\) and \[...\] into $...$ and $$...$$ for unified handling
const normalizeDelimiters = (text: string): string => {
  // \[...\] → $$...$$  (block)
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
  // \(...\) → $...$  (inline)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
  return text;
};

export const renderLatexContent = (text: string): React.ReactNode => {
  if (!text) return null;

  // Decide BEFORE cleaning whether to take the rich-HTML path or the plain
  // text + LaTeX path. Editors hand us full HTML (with data-latex chips);
  // everything else is plain text that may contain `$..$` math.
  const isRichHtml =
    text.includes('data-latex') ||
    text.includes('data-math-latex') ||
    /<(p|div|span|strong|em|sup|sub|br|ul|ol|li)\b/i.test(text);

  // For non-HTML content, run the cleaner so leaked chips/styles disappear
  // while LaTeX is preserved. For HTML, keep the original markup intact.
  if (!isRichHtml) {
    text = cleanMathContent(text);
    if (!text) return null;
  }

  // If text contains HTML with data-latex attributes, parse and render math
  if (text.includes('data-latex') || text.includes('data-math-latex')) {
    const container = document.createElement('div');
    container.innerHTML = text;

    container.querySelectorAll('[data-latex], [data-math-latex]').forEach((node) => {
      const el = node as HTMLElement;
      const latex = el.getAttribute('data-latex') || el.dataset.mathLatex || '';
      const isBlock = el.dataset.display === 'block';
      try {
        el.innerHTML = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: isBlock,
          trust: true,
          strict: false
        });
      } catch {
        el.textContent = latex;
      }
    });

    return <span dangerouslySetInnerHTML={{ __html: container.innerHTML }} />;
  }

  // If text contains HTML tags (e.g. from RichTextEditor), render as HTML
  // while also processing any $...$ LaTeX delimiters within
  if (/<[a-z][\s\S]*>/i.test(text)) {
    // Process $...$ inside the HTML by replacing them with rendered KaTeX
    let processed = normalizeDelimiters(text);
    processed = processed.replace(/\$\$([^$]+?)\$\$/g, (_, latex) => {
      try {
        return katex.renderToString(latex, { throwOnError: false, displayMode: true, trust: true, strict: false });
      } catch { return latex; }
    });
    processed = processed.replace(/\$([^$]+?)\$/g, (_, latex) => {
      try {
        return katex.renderToString(latex, { throwOnError: false, displayMode: false, trust: true, strict: false });
      } catch { return latex; }
    });
    return <span dangerouslySetInnerHTML={{ __html: processed }} />;
  }

  // Normalize \(...\) and \[...\] to $ and $$
  const normalized = normalizeDelimiters(text);

  // Split on $$...$$ (block) and $...$ (inline)
  const parts = normalized.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const latex = part.slice(2, -2);
      try {
        return (
          <div
            key={index}
            className="my-2"
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(latex, { throwOnError: false, displayMode: true, trust: true, strict: false })
            }}
          />
        );
      } catch {
        return <div key={index}>{part}</div>;
      }
    }

    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const latex = part.slice(1, -1);
      try {
        return (
          <span
            key={index}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(latex, { throwOnError: false, trust: true, strict: false })
            }}
          />
        );
      } catch {
        return <span key={index}>{part}</span>;
      }
    }

    // Handle markdown bold and line breaks
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((boldPart, boldIndex) => {
      if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
        return <strong key={`${index}-${boldIndex}`}>{boldPart.slice(2, -2)}</strong>;
      }
      return boldPart.split('\n').map((line, lineIndex) => (
        <React.Fragment key={`${index}-${boldIndex}-${lineIndex}`}>
          {lineIndex > 0 && <br />}
          {line}
        </React.Fragment>
      ));
    });
  });
};
