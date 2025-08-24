import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const KaTeXTest = () => {
  const testEquation = '\\sqrt{5}';
  
  const renderLatex = (latex: string) => {
    try {
      return katex.renderToString(latex, {
        displayMode: false,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false,
        trust: true
      });
    } catch (error) {
      console.error('KaTeX error:', error);
      return `<span style="color: red;">Error: ${latex}</span>`;
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">KaTeX Test</h3>
      <p>Raw LaTeX: {testEquation}</p>
      <p>Rendered: <span dangerouslySetInnerHTML={{ __html: renderLatex(testEquation) }} /></p>
      <p>With dollar signs: <span dangerouslySetInnerHTML={{ __html: renderLatex('\\sqrt{5}') }} /></p>
    </div>
  );
};

export default KaTeXTest;