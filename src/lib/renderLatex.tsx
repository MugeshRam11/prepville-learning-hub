import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Render text containing LaTeX math expressions.
 * Supports:
 * - HTML with data-latex / data-math-latex attributes
 * - $$...$$ block math
 * - $...$ inline math
 * - Markdown bold and line breaks
 */
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

  // Split on $$...$$ (block) and $...$ (inline)
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const latex = part.slice(2, -2);
      try {
        return (
          <div
            key={index}
            className="my-2"
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(latex, { throwOnError: false, displayMode: true })
            }}
          />
        );
      } catch {
        return <div key={index}>{part}</div>;
      }
    }

    if (part.startsWith('$') && part.endsWith('$')) {
      const latex = part.slice(1, -1);
      try {
        return (
          <span
            key={index}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(latex, { throwOnError: false })
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
