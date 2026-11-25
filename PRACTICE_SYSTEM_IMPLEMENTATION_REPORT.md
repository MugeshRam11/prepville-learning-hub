# PrepVille Practice implementation report

25 November 2026 · IB MYP Mathematics, Years 1–5

**Local implementation and verification passed. Production has open P0 authorization findings.** Git and the GitHub connector both denied repository writes. The local branch and exported commit series are the review deliverables. Production inspection used catalog metadata and aggregate counts only.

## 1. Repository

| Item | Verified result |
| --- | --- |
| Integration base | `origin/fix/day3-security-practice-engine-2026-11-04` at `7a1c78af75cc68b8aadd99760b7301eafb85afcc` |
| Starting checkout | Clean `feat/day4-canonical-math-pipeline` at the same SHA after fetching origin |
| Working branch | `feat/practice-question-bank-production-integration` |
| Implementation tip before this report | `6c7e96752cc145230e2909a5a7c24b2ea21b12e4` |
| Historical hardening object | `f85e17a` unavailable locally after fetch |
| Pull request | None. Git push returned HTTP 403 and connector branch creation returned “Resource not accessible by integration.” Intended base is the Day 3 integration branch. |
| Deployment | Local commits only. Production requires separate approval. |

### Implementation commits

```text
dfa5d4a Restrict practice state writes and quarantine unclassified legacy questions
c6f8868 Save question content, parts and marking keys in one transaction
5af11e0 Route legacy practice editors to the paginated question bank
0ee31d9 Import each CSV row atomically with batch identity and row outcomes
7edf799 Filter the student catalogue and attempt history before counting and paging
1ab2895 Generate exact-size student papers from persistent selections or curriculum filters
5f00f19 Prevent mass administrator grants and guessed year assignments during rollout
4cef74b Grade owned submissions per part and withhold pending scores and paper solutions
86b303c Share the resumable multi-part workspace and flush drafts before final submission
3a517cd Validate publication, protect legacy keys and support reviewed part marks and archived prompts
2e1f2d6 Complete input configuration, polynomial grading and authenticated role resolution
052ebd2 Validate interactive and CSV saves against a shared typed question contract
6dd38ed Exercise real PostgreSQL policies and mobile browser practice journeys
c8bb80e Retain historical grading identities when revising attempted questions
465cba9 Recover unsynced drafts and verify study and mock submission through Chrome
6c7e967 Keep legacy ungraded responses pending and verify scoped catalogue totals
```

### Changed files

Relative to the integration base, excluding this report.

```text
.gitignore
e2e/practice/workflows.spec.mjs
eslint.config.js
package-lock.json
package.json
playwright.practice.config.mjs
src/components/admin/AdminSidebar.tsx
src/components/admin/CSVImportModal.tsx
src/components/admin/PracticeGrading.tsx
src/components/admin/PracticeMarkingFields.tsx
src/components/admin/QuestionBankManager.tsx
src/components/practice/PracticeSessionGeneratorModal.tsx
src/hooks/useAdminAuth.tsx
src/hooks/useAuth.tsx
src/hooks/useStudentAuth.tsx
src/integrations/supabase/types.ts
src/lib/practiceQuestion.ts
src/lib/roleService.ts
src/pages/AdminQuestions.tsx
src/pages/MockExamStart.tsx
src/pages/MockExamSubjectView.tsx
src/pages/Practice.tsx
src/pages/PracticeExam.tsx
src/pages/PracticeQuestionView.tsx
src/pages/PracticeSessionWorkspace.tsx
src/pages/UnifiedMockExam.tsx
src/routes/admin.routes.tsx
src/services/mockExamService.ts
supabase/migrations/20260808120000_fix_mock_tests_admin_rls.sql
supabase/migrations/20261103000000_remediate_p0_admin_rls.sql
supabase/migrations/20261103020000_migrate_legacy_practice_data.sql
supabase/migrations/20261125000000_practice_permissions.sql
supabase/migrations/20261125000100_save_practice_question.sql
supabase/migrations/20261125000200_bank_search.sql
supabase/migrations/20261125000300_practice_catalogue.sql
supabase/migrations/20261125000400_student_papers.sql
supabase/migrations/20261125000450_practice_polynomials.sql
supabase/migrations/20261125000500_practice_evaluation.sql
supabase/migrations/20261125000600_protect_publication_and_review.sql
supabase/migrations/20261125000700_practice_workspace.sql
supabase/migrations/20261125000800_student_mock_prompt_access.sql
supabase/migrations/20261125000900_practice_answer_contract.sql
tests/fixtures/practice-baseline.sql
tests/practice-integration.test.mjs
```

## 2. Supabase production inspection

Project `mvmciqmszakciijfdyos` (study hub) reported `ACTIVE_HEALTHY` on PostgreSQL 17.4. The live ledger contained **87 migrations** through `20260701161444`. None of the November Practice versions appeared. Historical live version identifiers and repository filenames differ even before November. Reconcile migration contents against a staging copy before selecting migrations for rollout.

| Live object | Observed definition or result |
| --- | --- |
| `question_bank`, `question_subquestions`, `question_answer_keys` | Absent. Canonical published and draft counts are unavailable. |
| `practice_sessions`, `practice_session_questions`, `legacy_question_id_map` | Absent. The Day 3 Practice RPCs were also absent. |
| `practice_sets` | 1 set, published. UUID primary key, creator FK to Auth with SET NULL, boolean publication/archive columns, composite publication/archive index. |
| `practice_questions` | 1 question. UUID primary key, indexed set FK with CASCADE, prompt, image, LaTeX, Unicode and display order. |
| `practice_sub_questions` | 2 parts. UUID primary key, indexed question FK with CASCADE, integer marks/order, constrained answer type, JSONB configuration, text answer key and solution. |

All three legacy Practice tables had RLS enabled and broad table privileges for anonymous and authenticated roles. The seven legacy Practice and Mock authoring tables still had permissive ALL policies with unconditional predicates. Published-only read policies coexisted with those ALL policies. The answer-bearing legacy tables remained exposed.

The live role-assignment policy permitted writes to a user's own role rows. The signup hook derived privileged profile roles from user-controlled metadata. Both signed-in and anonymous roles had execute privilege on a SECURITY DEFINER administrator-promotion function without a caller authorization check in its body. These findings come from policy, privilege, function and trigger definitions. No live role change or mutation was attempted.

The local migrations replace the role authority, restrict grading and session writes, close the promotion entry point, check publication at commit, and give the student Mock reader a published-prompt projection. Historical role assignments require owner reconciliation. The unapplied August migration in this repository originally promoted every account. Its replacement is intentionally empty. The legacy migration now leaves unknown years unset and keeps imported records pending. The eleven new migration files are listed above. All production tables, data, credentials and deployment state were left as found.

## 3. Administrator workflow

The Question Bank is the administrator entry point. Legacy set listing, creation and editing URLs redirect to it. Mock Exam authoring retains its existing routes.

The typed authoring contract and a single PostgreSQL transaction save the parent, ordered parts, protected keys, solutions and rubrics. New content defaults to draft. Publication checks MYP eligibility, marks and key completeness. For questions with attempts, edits create a revised question and archive the preceding version in the same transaction. Original IDs, keys and session prompts remain available for review.

CSV import includes a downloadable template, preview, curriculum and math validation, row errors, duplicate detection, and a UUID batch identifier. Each accepted row commits with its key under review pending. Counts distinguish committed imports, duplicates and rejected rows. The batch identifier supports locating and archiving an import.

Administration queries use 20-row server pages with search, year, strand, topic, difficulty, type and status filters. Archived questions have a dedicated filter. The grading panel displays student responses, reference answers, protected rubrics and mark limits and supports human review or override.

## 4. Student workflow

Practice opens the independent catalogue. PostgreSQL scopes attempt history to the signed-in student, applies search and filters, counts the matching rows, and returns a stable 12-question page. Correct and incorrect filters become available when the student has evaluation data.

Start Practice creates or resumes a study attempt. The paper generator accepts 1–50 approved, published MYP Mathematics questions. Students can retain manual selections across pages and filters or generate a paper by curriculum and history. The server checks eligibility, uniqueness and inventory, serializes matching retries, and records membership and order. Insufficient inventory returns the available count and creates no partial paper.

The shared workspace displays part-specific answer controls, flags, progress, a timer and save state. Draft writes are serialized and final submission flushes pending changes. The browser retains unsynced drafts under the student's session and question IDs for recovery after a refresh. Archived content remains available through the owned session's saved prompt. Study submissions can unlock feedback immediately. Paper solutions unlock after final submission.

## 5. Evaluation

The backend uses the owned session, question, part, submitted answer and protected key. Numeric grading supports tolerance, single-choice grading uses the configured option ID, and an exact coefficient comparison handles supported polynomial expressions in one variable. Other mathematical expressions and extended working enter human review. No AI grading service was introduced.

Each part records its answer, possible and awarded marks, evaluation method and timestamp. Human grading records the reviewer. Final percentages are mark-weighted. Pending or historically incomplete grading keeps the final score null. Finalized submissions reject subsequent draft or submission writes.

## 6. Verification evidence

| Verification | Result |
| --- | --- |
| `npm test` | 62 passed, 0 failed. Includes the existing suite and an in-memory PostgreSQL integration scenario. |
| `npx tsc --noEmit -p tsconfig.app.json` | Exit 0. |
| `npm run lint -- --quiet` | Exit 0. |
| `npm run build` | Exit 0. Vite reported the existing large-chunk warning and outdated Browserslist data. |
| `npx playwright test --config=playwright.practice.config.mjs` | Chromium journey passed, including a 390 × 844 student viewport. |
| Migration execution | The Practice rollout from the synthetic legacy baseline ran in isolated PGlite. The fixture supplies Auth roles, UID context, legacy tables and policy names. |
| Database roles | Anonymous mutation, non-admin question saves, role mutation, direct scoring/submission, cross-owner access and premature solution access were checked. The suite also compares scoped history across two students. |
| Content and submissions | Single/multipart save, rollback, duplicate import, publication checks, exact inventory, study resume, LaTeX preservation, numeric/choice/polynomial grading, human review, archival and revision identity were exercised. |
| Browser regression | Admin draft creation, CSV import/publication, mobile cross-page selection, autosave/reload, paper completion, independent study submission and existing Mock Exam question delivery/submission were exercised. |
| Test boundaries | Chromium used synthetic sessions and a local PostgREST adapter. Practice operations and the Mock read projection executed the migrations in PGlite. The browser adapter captured Mock attempt and evaluation writes. Hosted Auth, PostgREST, Realtime and the complete production migration history require staging verification. |

### Performance on synthetic inventory

The final Node test seeded 10,000 published synthetic fraction questions in addition to its functional fixtures. It measured **45.8 ms** for a 50-question generation RPC. A broad text search combined with unattempted history, exact count, offset 120 and limit 12 took **59.599 ms execution** and **3.726 ms planning** under EXPLAIN ANALYZE. These are single local PGlite measurements. They exclude network, concurrency and hosted PostgREST overhead.

The catalogue plan scanned the matching inventory, joined scoped history, counted all 10,000 matches and used a top-N sort for the requested page. The exact count still scales with the number of matches. The application requests only the page payload. The integration test prints the full plan on each run.

<details>
<summary>Recorded local query plan</summary>

```text
Limit  (cost=3782.96..3782.99 rows=12 width=32) (actual time=59.138..59.170 rows=12 loops=1)
  Buffers: shared hit=324
  InitPlan 1
    ->  Result  (cost=0.00..0.02 rows=1 width=16) (never executed)
  ->  Sort  (cost=3782.64..3807.60 rows=9983 width=32) (actual time=59.081..59.132 rows=132 loops=1)
        Sort Key: q.created_at DESC, q.id
        Sort Method: top-N heapsort  Memory: 33kB
        Buffers: shared hit=324
        ->  WindowAgg  (cost=3380.78..3381.11 rows=9983 width=32) (actual time=44.958..52.555 rows=10000 loops=1)
              Buffers: shared hit=324
              ->  Hash Left Join  (cost=157.88..3256.32 rows=9983 width=24) (actual time=2.285..34.437 rows=10000 loops=1)
                    Hash Cond: (q.id = h.question_id)
                    Filter: (COALESCE(h.attempt_status, 'unattempted'::text) = 'unattempted'::text)
                    Buffers: shared hit=324
                    ->  Bitmap Heap Scan on question_bank q  (cost=121.84..3194.06 rows=9983 width=24) (actual time=0.522..19.894 rows=10000 loops=1)
                          Recheck Cond: (myp_year IS NOT NULL)
                          Filter: (is_published AND (programme = 'MYP'::text) AND (subject = 'mathematics'::text) AND (review_status = 'approved'::text) AND ((is_published AND (review_status = 'approved'::text) AND (programme = 'MYP'::text) AND (subject = 'mathematics'::text) AND (myp_year IS NOT NULL)) OR has_role((InitPlan 1).col1, 'admin'::text)) AND (search_document @@ '''fractions'''::tsquery))
                          Rows Removed by Filter: 8
                          Heap Blocks: exact=295
                          Buffers: shared hit=305
                          ->  Bitmap Index Scan on idx_qb_filters  (cost=0.00..119.34 rows=10008 width=0) (actual time=0.426..0.427 rows=10012 loops=1)
                                Index Cond: (myp_year IS NOT NULL)
                                Buffers: shared hit=10
                    ->  Hash  (cost=36.03..36.03 rows=1 width=48) (actual time=1.725..1.735 rows=5 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 5kB
                          Buffers: shared hit=19
                          ->  Subquery Scan on h  (cost=36.01..36.03 rows=1 width=48) (actual time=1.381..1.709 rows=5 loops=1)
                                Buffers: shared hit=19
                                ->  Unique  (cost=36.01..36.02 rows=1 width=74) (actual time=1.375..1.667 rows=5 loops=1)
                                      Buffers: shared hit=19
                                      InitPlan 2
                                        ->  Result  (cost=0.00..0.02 rows=1 width=16) (actual time=0.022..0.024 rows=1 loops=1)
                                      InitPlan 3
                                        ->  Result  (cost=0.00..0.02 rows=1 width=16) (actual time=0.009..0.010 rows=1 loops=1)
                                      InitPlan 4
                                        ->  Result  (cost=0.00..0.02 rows=1 width=16) (never executed)
                                      InitPlan 13
                                        ->  Result  (cost=0.00..0.02 rows=1 width=16) (never executed)
                                      InitPlan 14
                                        ->  Result  (cost=0.00..0.02 rows=1 width=16) (never executed)
                                      ->  Sort  (cost=35.91..35.91 rows=1 width=74) (actual time=1.371..1.382 rows=6 loops=1)
                                            Sort Key: sq.question_id, ((sq.attempt_status = ANY ('{evaluated,submitted}'::text[]))) DESC, sq.updated_at DESC, sq.id
                                            Sort Method: quicksort  Memory: 17kB
                                            Buffers: shared hit=19
                                            ->  Nested Loop  (cost=4.31..35.90 rows=1 width=74) (actual time=0.301..1.325 rows=6 loops=1)
                                                  Buffers: shared hit=19
                                                  ->  Index Scan using practice_sessions_user_id_request_id_key on practice_sessions s  (cost=0.15..8.42 rows=1 width=16) (actual time=0.146..0.185 rows=6 loops=1)
                                                        Index Cond: (user_id = (InitPlan 2).col1)
                                                        Filter: ((user_id = (InitPlan 3).col1) OR has_role((InitPlan 4).col1, 'admin'::text))
                                                        Buffers: shared hit=2
                                                  ->  Bitmap Heap Scan on practice_session_questions sq  (cost=4.16..27.47 rows=1 width=88) (actual time=0.043..0.150 rows=1 loops=6)
                                                        Recheck Cond: (s.id = session_id)
                                                        Filter: ((attempt_status <> 'unattempted'::text) AND ((ANY (session_id = (hashed SubPlan 12).col1)) OR has_role((InitPlan 13).col1, 'admin'::text) OR has_role((InitPlan 14).col1, 'admin'::text)))
                                                        Rows Removed by Filter: 8
                                                        Heap Blocks: exact=9
                                                        Buffers: shared hit=17
                                                        ->  Bitmap Index Scan on idx_psq_session  (cost=0.00..4.16 rows=2 width=0) (actual time=0.008..0.008 rows=9 loops=6)
                                                              Index Cond: (session_id = s.id)
                                                              Buffers: shared hit=6
                                                        SubPlan 12
                                                          ->  Index Scan using practice_sessions_user_id_request_id_key on practice_sessions ps  (cost=0.21..8.48 rows=1 width=16) (actual time=0.026..0.047 rows=6 loops=1)
                                                                Index Cond: (user_id = (InitPlan 9).col1)
                                                                Filter: ((user_id = (InitPlan 10).col1) OR has_role((InitPlan 11).col1, 'admin'::text))
                                                                Buffers: shared hit=2
                                                                InitPlan 9
                                                                  ->  Result  (cost=0.00..0.02 rows=1 width=16) (actual time=0.008..0.010 rows=1 loops=1)
                                                                InitPlan 10
                                                                  ->  Result  (cost=0.00..0.02 rows=1 width=16) (actual time=0.008..0.009 rows=1 loops=1)
                                                                InitPlan 11
                                                                  ->  Result  (cost=0.00..0.02 rows=1 width=16) (never executed)
Planning Time: 3.726 ms
Execution Time: 59.599 ms
```

</details>

## 7. Release gates and owner actions

1. Prioritize live role integrity and unrestricted legacy authoring policies as an incident. Review historical administrator assignments and relevant audit logs using an owner-verified roster. Confirm credential rotation through the normal secret-management process.
2. Reconcile the hosted migration ledger and schema with an isolated staging copy. Validate the complete migration sequence, existing administrators' sign-in, Mock authoring/attempt/evaluation flows, and real PostgREST grants there. The local fixture models the Practice dependencies and selected Mock regressions.
3. Have a curriculum reviewer classify the legacy item and check answer configurations before publication. Complex LaTeX and long working require reviewer capacity. The polynomial evaluator supports integer monomials in x and their sums.
4. A repository writer can apply the exported mailbox patch on the verified Day 3 base and open the integration PR. Production migration or deployment requires explicit owner approval. The live P0 release gate remains open.
