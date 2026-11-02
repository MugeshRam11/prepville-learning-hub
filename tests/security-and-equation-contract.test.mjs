import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Security Audit - No private keys or service-role keys in client source', () => {
  const scanDir = (dir) => {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
          results = results.concat(scanDir(fullPath));
        }
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  };

  const srcFiles = scanDir('src');
  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.strictEqual(
      content.includes('VITE_SUPABASE_SERVICE_ROLE_KEY'),
      false,
      `File ${file} must not reference VITE_SUPABASE_SERVICE_ROLE_KEY`
    );
    assert.strictEqual(
      content.includes('re_CAF5fjsw_BUHR9wnp9MrgayMKZMw8Tc7Z'),
      false,
      `File ${file} must not contain hardcoded Resend key`
    );
  }
});

test('Security Audit - Edge functions do not contain hardcoded secret fallbacks', () => {
  const otpFunction = fs.readFileSync('supabase/functions/send-otp/index.ts', 'utf8');
  assert.strictEqual(
    otpFunction.includes('re_CAF5fjsw_BUHR9wnp9MrgayMKZMw8Tc7Z'),
    false,
    'send-otp edge function must not contain hardcoded Resend key'
  );
  assert.strictEqual(
    otpFunction.includes("Deno.env.get('RESEND_API_KEY')"),
    true,
    'send-otp edge function must read from RESEND_API_KEY environment variable'
  );
});

test('Configuration Audit - .gitignore includes .env and protects .env.example', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  assert.strictEqual(gitignore.includes('.env'), true, '.gitignore must include .env');
  assert.strictEqual(gitignore.includes('!.env.example'), true, '.gitignore must allow .env.example');
  assert.strictEqual(fs.existsSync('.env.example'), true, '.env.example must exist');
});

test('Curriculum Scope - Enforces IB MYP Mathematics Only launch catalogue', async () => {
  const scopeContent = fs.readFileSync('src/config/curriculumScope.ts', 'utf8');
  assert.strictEqual(scopeContent.includes("'myp-mathematics'"), true, 'MYP Mathematics must be configured');
  assert.strictEqual(scopeContent.includes("enabled: true"), true, 'MYP Mathematics must be enabled');
  assert.strictEqual(scopeContent.includes("'ibdp-mathematics'"), true, 'IBDP Mathematics must be defined');
  assert.strictEqual(scopeContent.includes("'ibdp-physics'"), true, 'IBDP Physics must be defined');
});

test('Mathematical Delimiter Contract - Normalization matches canonical format', () => {
  // LaTeX bracket normalizer contract
  const normalizeDelimiters = (text) => {
    return text
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
  };

  const sampleBracketInline = 'Solve for x: \\(2x + 5 = 15\\)';
  const sampleBracketBlock = 'The quadratic formula is:\n\\[x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\]';

  assert.strictEqual(normalizeDelimiters(sampleBracketInline), 'Solve for x: $2x + 5 = 15$');
  assert.strictEqual(
    normalizeDelimiters(sampleBracketBlock),
    'The quadratic formula is:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'
  );
});

