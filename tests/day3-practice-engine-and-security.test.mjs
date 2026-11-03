import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('P0-01 Security Audit - practice_session_questions RLS write lockdown in Day 3 migration', () => {
  const migrationPath = path.join(
    projectRoot,
    'supabase/migrations/20261104000000_remediate_p0_security_and_practice_engine.sql'
  );
  assert.ok(fs.existsSync(migrationPath), 'Day 3 remediation migration must exist');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // Verify drop of overly permissive student write policy
  assert.match(
    migrationSql,
    /DROP POLICY IF EXISTS "Students manage questions in their own sessions" ON public\.practice_session_questions/i,
    'Overly permissive student write policy must be dropped'
  );

  // Verify select-only student policy
  assert.match(
    migrationSql,
    /CREATE POLICY "Students can view questions in their own sessions"\s+ON public\.practice_session_questions FOR SELECT/i,
    'practice_session_questions must have SELECT-only policy for students'
  );

  // Verify direct UPDATE policy is NOT granted to students
  assert.ok(
    !migrationSql.includes('ON public.practice_session_questions FOR UPDATE TO authenticated'),
    'Students must never be granted direct UPDATE policy on practice_session_questions'
  );

  // Verify direct ALL policy is NOT granted to non-admin students
  assert.ok(
    !migrationSql.includes('ON public.practice_session_questions FOR ALL TO authenticated\n  USING (true)'),
    'Students must never have unrestricted ALL write access'
  );
});

test('P0-01 Security Audit - Solution reveal requires submitted/evaluated attempt_status', () => {
  const migrationPath = path.join(
    projectRoot,
    'supabase/migrations/20261104000000_remediate_p0_security_and_practice_engine.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(
    migrationSql,
    /CREATE OR REPLACE FUNCTION public\.get_practice_question_solution/i,
    'get_practice_question_solution function must be defined'
  );

  assert.match(
    migrationSql,
    /v_status NOT IN \('submitted', 'evaluated'\)/i,
    'get_practice_question_solution must strictly require submitted or evaluated status before unlocking answers'
  );
});

test('P0-02 Security Audit - Legacy answer exposure remediation via secure views', () => {
  const migrationPath = path.join(
    projectRoot,
    'supabase/migrations/20261104000000_remediate_p0_security_and_practice_engine.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // Verify views created with security_invoker = true
  assert.match(
    migrationSql,
    /CREATE OR REPLACE VIEW public\.student_mock_questions_view\s+WITH \(security_invoker = true\)/i,
    'student_mock_questions_view must be created'
  );
  assert.match(
    migrationSql,
    /CREATE OR REPLACE VIEW public\.student_mock_sub_questions_view\s+WITH \(security_invoker = true\)/i,
    'student_mock_sub_questions_view must be created'
  );
  assert.match(
    migrationSql,
    /CREATE OR REPLACE VIEW public\.student_practice_sub_questions_view\s+WITH \(security_invoker = true\)/i,
    'student_practice_sub_questions_view must be created'
  );

  // Check student_practice_sub_questions_view definition does NOT include answer_key or solution
  const practiceViewMatch = migrationSql.match(
    /CREATE OR REPLACE VIEW public\.student_practice_sub_questions_view[\s\S]*?FROM public\.practice_sub_questions;/i
  );
  assert.ok(practiceViewMatch, 'student_practice_sub_questions_view definition found');
  const viewDef = practiceViewMatch[0];
  assert.ok(!viewDef.includes('answer_key'), 'student_practice_sub_questions_view must exclude answer_key');
  assert.ok(!viewDef.includes('solution'), 'student_practice_sub_questions_view must exclude solution');
});

test('D3-01 Migration Integrity - Question bank audit metrics & legacy classification remediation', () => {
  const migrationPath = path.join(
    projectRoot,
    'supabase/migrations/20261104000000_remediate_p0_security_and_practice_engine.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(
    migrationSql,
    /UPDATE public\.question_bank\s+SET\s+review_status = 'review_pending',\s+is_published = false/i,
    'Unverified migrated questions must be set to review_pending and unpublished'
  );

  assert.match(
    migrationSql,
    /CREATE OR REPLACE FUNCTION public\.get_question_bank_audit_metrics/i,
    'get_question_bank_audit_metrics RPC must be implemented'
  );
});

test('D3-07 & PV-19 Architecture - Practice session generation RPC enforces 50 question limit and MYP Mathematics scope', () => {
  const migrationPath = path.join(
    projectRoot,
    'supabase/migrations/20261104000000_remediate_p0_security_and_practice_engine.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(
    migrationSql,
    /CREATE OR REPLACE FUNCTION public\.generate_practice_session/i,
    'generate_practice_session RPC must be implemented'
  );

  // Enforce question count limit clamp to max 50
  assert.match(
    migrationSql,
    /ELSIF v_limit > 50 THEN\s+v_limit := 50;/i,
    'generate_practice_session must enforce a hard maximum of 50 questions'
  );

  // Enforce strict MYP Mathematics scope
  assert.match(
    migrationSql,
    /qb\.programme = 'MYP'\s+AND qb\.subject = 'mathematics'/i,
    'generate_practice_session must strictly query MYP Mathematics'
  );
});

test('D3-08 & PV-20 Architecture - Routes & TypeScript RPC Contracts', () => {
  // Route Constants
  const routesPath = path.join(projectRoot, 'src/routes/routeConstants.ts');
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  assert.ok(
    routesContent.includes("PRACTICE_SESSION: '/practice/session/:sessionId'"),
    'PRACTICE_SESSION route constant must be defined'
  );

  // Student Routes
  const studentRoutesPath = path.join(projectRoot, 'src/routes/student.routes.tsx');
  const studentRoutesContent = fs.readFileSync(studentRoutesPath, 'utf8');
  assert.ok(
    studentRoutesContent.includes('ROUTES.STUDENT.PRACTICE_SESSION'),
    'PRACTICE_SESSION route must be mounted in student.routes.tsx'
  );
  assert.ok(
    studentRoutesContent.includes('PracticeSessionWorkspace'),
    'PracticeSessionWorkspace component must be lazy imported and rendered'
  );

  // Supabase Database Types
  const typesPath = path.join(projectRoot, 'src/integrations/supabase/types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  assert.ok(
    typesContent.includes('generate_practice_session:'),
    'generate_practice_session RPC must be declared in Supabase types'
  );
  assert.ok(
    typesContent.includes('start_single_question_attempt:'),
    'start_single_question_attempt RPC must be declared in Supabase types'
  );
  assert.ok(
    typesContent.includes('save_practice_draft_answer:'),
    'save_practice_draft_answer RPC must be declared in Supabase types'
  );
  assert.ok(
    typesContent.includes('submit_practice_question_answer:'),
    'submit_practice_question_answer RPC must be declared in Supabase types'
  );
  assert.ok(
    typesContent.includes('complete_practice_session:'),
    'complete_practice_session RPC must be declared in Supabase types'
  );
  assert.ok(
    typesContent.includes('get_practice_question_solution:'),
    'get_practice_question_solution RPC must be declared in Supabase types'
  );
});
