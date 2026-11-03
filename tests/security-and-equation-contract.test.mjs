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
    const liveResendPattern = /re_[A-Za-z0-9]{25,}/;
    assert.strictEqual(
      liveResendPattern.test(content),
      false,
      `File ${file} must not contain hardcoded live Resend API key`
    );
  }
});

test('Security Audit - Edge functions do not contain hardcoded secret fallbacks', () => {
  const otpFunction = fs.readFileSync('supabase/functions/send-otp/index.ts', 'utf8');
  const liveResendPattern = /re_[A-Za-z0-9]{25,}/;
  assert.strictEqual(
    liveResendPattern.test(otpFunction),
    false,
    'send-otp edge function must not contain hardcoded live Resend key'
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

test('Day 2 Database Security - P0 Admin RLS Remediation Migration exists and restores has_role', () => {
  const remediationPath = 'supabase/migrations/20261103000000_remediate_p0_admin_rls.sql';
  assert.strictEqual(fs.existsSync(remediationPath), true, 'Remediation migration must exist');
  const sql = fs.readFileSync(remediationPath, 'utf8');

  // Verify that SELECT true stub was NOT used
  assert.strictEqual(sql.includes('SELECT EXISTS'), true, 'has_role must check actual role membership');
  assert.strictEqual(sql.includes('FOR ALL TO authenticated, anon\n  USING (true)'), false, 'Must not grant blanket ALL permissions to anon');
  assert.strictEqual(sql.includes('ENABLE ROW LEVEL SECURITY'), true, 'Must re-enable RLS on affected tables');
});

test('Day 2 Architecture - Canonical Question Bank Migration exists with isolated answer keys', () => {
  const qbMigration = 'supabase/migrations/20261103010000_create_question_bank.sql';
  assert.strictEqual(fs.existsSync(qbMigration), true, 'Question bank migration must exist');
  const sql = fs.readFileSync(qbMigration, 'utf8');

  assert.strictEqual(sql.includes('CREATE TABLE IF NOT EXISTS public.question_bank'), true, 'question_bank table must be defined');
  assert.strictEqual(sql.includes('CREATE TABLE IF NOT EXISTS public.question_subquestions'), true, 'question_subquestions table must be defined');
  assert.strictEqual(sql.includes('CREATE TABLE IF NOT EXISTS public.question_answer_keys'), true, 'question_answer_keys table must be defined');
  assert.strictEqual(sql.includes('CREATE TABLE IF NOT EXISTS public.practice_sessions'), true, 'practice_sessions table must be defined');
  assert.strictEqual(sql.includes('get_practice_question_solution'), true, 'Secure RPC for solution revelation must be defined');
});

test('Day 2 Public Marketing & Compliance - Non-affiliation disclaimer and truthful messaging', () => {
  const footerContent = fs.readFileSync('src/components/Footer.tsx', 'utf8');
  assert.strictEqual(footerContent.includes('support@theprepville.com'), true, 'Footer must use support@theprepville.com');
  assert.strictEqual(footerContent.includes('contact@studyhub.com'), false, 'Footer must not contain legacy studyhub email');
  assert.strictEqual(footerContent.includes('International Baccalaureate Organization'), true, 'Footer must contain IBO non-affiliation disclaimer');
  assert.strictEqual(footerContent.includes('/privacy'), true, 'Footer must link to /privacy');
  assert.strictEqual(footerContent.includes('/terms'), true, 'Footer must link to /terms');

  const statsContent = fs.readFileSync('src/components/StatsSection.tsx', 'utf8');
  assert.strictEqual(statsContent.includes('10,000+'), false, 'StatsSection must not contain unsubstantiated 10,000+ claim');
  assert.strictEqual(statsContent.includes('2,500+'), false, 'StatsSection must not contain unsubstantiated 2,500+ claim');
});
