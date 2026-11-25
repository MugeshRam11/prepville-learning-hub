import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePureLatex,
  serializeInlineMath,
  serializeDisplayMath,
  convertLegacyTokens,
  extractCanonicalAnswerText,
  parseMixedProseAndMath,
  validateMathExpression,
  testRoundTripEquivalence
} from '../src/lib/canonicalMath.ts';

// 42-Case Mathematical Regression Matrix (as defined in Phase 6)
const REGRESSION_MATRIX = [
  { id: 1, category: 'Basic arithmetic', input: '3 + 5 \\times 2 - 8 \\div 4 = 11' },
  { id: 2, category: 'Fractions', input: '\\frac{3}{4} + \\frac{2}{5} = \\frac{23}{20}' },
  { id: 3, category: 'Nested fractions', input: '\\frac{1}{1 + \\frac{1}{1 + \\frac{1}{x}}}' },
  { id: 4, category: 'Exponents', input: 'x^2 + 2x + 1 = (x + 1)^2' },
  { id: 5, category: 'Grouped exponents', input: '2^{3x - 1} = 16' },
  { id: 6, category: 'Subscripts', input: 'a_1 + a_2 + a_3 + \\dots + a_n' },
  { id: 7, category: 'Mixed subscripts and superscripts', input: 'x_1^2 + x_2^2 + x_3^2' },
  { id: 8, category: 'Square roots', input: '\\sqrt{b^2 - 4ac}' },
  { id: 9, category: 'Cube roots', input: '\\sqrt[3]{x^3 + 8}' },
  { id: 10, category: 'General radicals', input: '\\sqrt[n]{x^n + y^n}' },
  { id: 11, category: 'Strict inequalities', input: '3x - 5 < 2x + 7' },
  { id: 12, category: 'Weak inequalities', input: '2x + 1 \\leq 9 \\text{ and } 3x - 2 \\geq 4' },
  { id: 13, category: 'Approximation', input: '\\pi \\approx 3.14159' },
  { id: 14, category: 'Lowercase Greek symbols', input: '\\alpha + \\beta + \\gamma = \\pi' },
  { id: 15, category: 'Uppercase Greek symbols', input: '\\Delta = b^2 - 4ac' },
  { id: 16, category: 'Set operations', input: 'A \\cup B \\text{ and } A \\cap B \\text{ and } A \\setminus B' },
  { id: 17, category: 'Set membership', input: 'x \\in A \\text{ and } y \\notin B \\text{ and } A \\subset B' },
  { id: 18, category: 'Trigonometry', input: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1' },
  { id: 19, category: 'Inverse trigonometry', input: '\\theta = \\arcsin\\left(\\frac{1}{2}\\right) = \\sin^{-1}\\left(\\frac{1}{2}\\right)' },
  { id: 20, category: 'Logarithms', input: '\\log_{10}(100) = 2 \\text{ and } \\ln(e^x) = x' },
  { id: 21, category: 'Absolute values', input: '|2x - 3| < 5' },
  { id: 22, category: 'Vector norms', input: '\\|\\vec{v}\\| = \\sqrt{v_1^2 + v_2^2}' },
  { id: 23, category: 'Vector notation', input: '\\vec{a} + \\vec{b} = \\mathbf{c}' },
  { id: 24, category: 'Column vectors', input: '\\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix}' },
  { id: 25, category: 'Matrices', input: '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}' },
  { id: 26, category: 'Determinants', input: '\\det(A) = \\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc' },
  { id: 27, category: 'Limits', input: '\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1' },
  { id: 28, category: 'Derivatives', input: '\\frac{d}{dx}(x^3 - 3x + 1) = 3x^2 - 3' },
  { id: 29, category: 'Partial derivatives', input: '\\frac{\\partial f}{\\partial x} + \\frac{\\partial f}{\\partial y} = 0' },
  { id: 30, category: 'Indefinite integrals', input: '\\int (3x^2 - 2x + 1) \\, dx = x^3 - x^2 + x + C' },
  { id: 31, category: 'Definite integrals', input: '\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}' },
  { id: 32, category: 'Summations', input: '\\sum_{k=1}^{n} k = \\frac{n(n + 1)}{2}' },
  { id: 33, category: 'Products', input: '\\prod_{i=1}^{n} i = n!' },
  { id: 34, category: 'Piecewise functions', input: 'f(x) = \\begin{cases} x^2 & \\text{if } x < 0 \\\\ 2x & \\text{if } x \\geq 0 \\end{cases}' },
  { id: 35, category: 'Multiline equations', input: '\\begin{aligned} 2x + 3 &= 11 \\\\ 2x &= 8 \\\\ x &= 4 \\end{aligned}' },
  { id: 36, category: 'Angles and degrees', input: '\\angle ABC = 45^\\circ' },
  { id: 37, category: 'Plus-minus notation', input: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { id: 38, category: 'Complex numbers', input: 'z = a + bi \\text{ and } |z| = \\sqrt{a^2 + b^2}' },
  { id: 39, category: 'Binomial coefficients', input: '\\binom{n}{k} = \\frac{n!}{k!(n - k)!}' },
  { id: 40, category: 'Mixed mathematical prose', input: 'Given the quadratic equation $ax^2 + bx + c = 0$, its roots are given by $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.' },
  { id: 41, category: 'Units and formatting', input: 'v = 25\\text{ m/s} \\text{ and } A = 150\\text{ cm}^2' },
  { id: 42, category: 'Currency and escaped dollar signs', input: 'The price is \\$50 per unit, and the total cost for $n$ units is given by $C = 50n + 15$ dollars.' }
];

describe('Phase 6 — Canonical Mathematical Pipeline & 42-Case Regression Matrix', () => {

  for (const testCase of REGRESSION_MATRIX) {
    test(`Case ${testCase.id}: [${testCase.category}] — Round-trip fidelity and parseability`, () => {
      if (testCase.id === 40 || testCase.id === 42) {
        // Mixed prose tests
        const result = testRoundTripEquivalence(testCase.input, 'mixed_prose');
        assert.equal(result.success, true, `Errors in case ${testCase.id}: ${result.errors.join('; ')}`);
        
        const segments = parseMixedProseAndMath(testCase.input);
        assert.ok(segments.length > 1, `Mixed prose must contain multiple segments`);
        
        // In case 42, verify \$50 is parsed as literal $ in text, not inline math
        if (testCase.id === 42) {
          const textSegments = segments.filter(s => s.type === 'text');
          const mathSegments = segments.filter(s => s.type === 'inline-math');
          assert.ok(textSegments.some(s => s.value.includes('$50')), 'Must preserve $50 as prose currency');
          assert.equal(mathSegments.length, 2, 'Must have exactly 2 inline math expressions: n and C = 50n + 15');
        }
      } else {
        // Pure LaTeX tests
        const validation = validateMathExpression(testCase.input);
        assert.equal(validation.isValid, true, `Validation failed for case ${testCase.id}: ${validation.errors.join('; ')}`);

        const roundTrip = testRoundTripEquivalence(testCase.input, 'pure_latex');
        assert.equal(roundTrip.success, true, `Round trip failed for case ${testCase.id}: ${roundTrip.errors.join('; ')}`);
      }
    });
  }

  test('Legacy token converter replaces [[EQ:id]] tokens from lookup table', () => {
    const raw = 'The solution is [[EQ:eq-123]] where [[EQ:eq-456]] is verified.';
    const legacyMap = [
      { id: 'eq-123', latex: 'x = \\frac{1}{2}' },
      { id: 'eq-456', latex: 'y > 0' }
    ];

    const converted = convertLegacyTokens(raw, legacyMap);
    assert.ok(converted.includes('$x = \\frac{1}{2}$'), 'Must convert eq-123 to inline math');
    assert.ok(converted.includes('$y > 0$'), 'Must convert eq-456 to inline math');
    assert.ok(!converted.includes('[[EQ:'), 'Must eliminate all [[EQ: tokens');
  });

  test('Legacy token converter replaces HTML data-latex chips', () => {
    const html = '<p>Calculate <span class="math-expression" data-latex="\\sqrt{64}">8</span> and simplify.</p>';
    const converted = convertLegacyTokens(html);
    assert.equal(converted, 'Calculate $\\sqrt{64}$ and simplify.');
  });

  test('extractCanonicalAnswerText handles structured objects and JSON strings', () => {
    const structuredObj = {
      text: 'Final result: [[EQ:1]]',
      equations: [{ id: '1', latex: 'a^2 + b^2 = c^2' }]
    };
    const extracted = extractCanonicalAnswerText(structuredObj);
    assert.equal(extracted, 'Final result: $a^2 + b^2 = c^2$');

    const jsonString = JSON.stringify(structuredObj);
    const fromJson = extractCanonicalAnswerText(jsonString);
    assert.equal(fromJson, 'Final result: $a^2 + b^2 = c^2$');
  });

  test('normalizePureLatex strips accidental delimiters', () => {
    assert.equal(normalizePureLatex('$x^2 + 1$'), 'x^2 + 1');
    assert.equal(normalizePureLatex('$$\\frac{a}{b}$$'), '\\frac{a}{b}');
    assert.equal(normalizePureLatex('\\(3x - 2\\)'), '3x - 2');
    assert.equal(normalizePureLatex('\\[\\int x dx\\]'), '\\int x dx');
  });

  test('validateMathExpression flags unbalanced braces and broken environments', () => {
    const unclosedBrace = validateMathExpression('\\frac{1}{2');
    assert.equal(unclosedBrace.isValid, false);
    assert.ok(unclosedBrace.errors.some(e => e.includes('brace')));

    const mismatchedEnv = validateMathExpression('\\begin{pmatrix} 1 & 2 \\end{matrix}');
    assert.equal(mismatchedEnv.isValid, false);
  });
});
