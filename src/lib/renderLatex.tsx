import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Render text containing LaTeX math expressions.
 * Supports:
 * - HTML with data-latex / data-math-latex attributes
 * - \[...\] and $$...$$ block math
 * - \(...\) and $...$ inline math
 * - Markdown bold and line breaks
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

  // If text contains HTML with data-latex attributes, parse it
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
