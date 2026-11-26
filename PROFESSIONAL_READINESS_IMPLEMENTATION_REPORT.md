# PrepVille readiness · 26 November 2026

**Decision: staging demonstration only. Production remains blocked.** This batch starts at `494716655c8f7eeb3b9c52b9bae3a1a722e25113` on `codex/student-readiness-nov26`. It targets IB MYP Mathematics, Years 1–5.

| Workstream | Status | Result |
|---|---|---|
| Production authorization incident | **Blocked** | Separate emergency containment SQL restricts seven legacy tables, freezes role writes and revokes the known promotion routine. It requires an independent roster audit, review and owner-authorized production change window. [Emergency SQL](supabase/emergency/contain_authoring.sql) |
| Dedicated staging | **Done for this rehearsal** | Owner approved the quoted zero-monthly-cost project. Supabase created `prepville-staging`, ref `eiqojioufllxcsedodnv`, region `ap-south-1`. The staging foundation reproduces prerequisite table shapes, constraints and enums from catalog metadata, with empty tables and synthetic Auth accounts. The full historic migration chain, ancillary dashboard services and backup/restore still require reconciliation. [Scope of baseline](supabase/staging/empty_readiness_baseline.sql) |
| Diagram authoring and delivery | **Done for the tested Practice journey** | Staff uploaded a plotted stem and two distinct part images, saved and reopened the draft, previewed and published it. Mobile Chrome opened a signed diagram, resumed answers after refresh and submitted. The hosted API also proved archived snapshot access, draft denial, format rejection and protected key isolation. [Parity matrix](MOCK_VS_PRACTICE_QUESTION_PARITY.md) |
| Media lifecycle and Mock regression | **Needs Verification** | A staged bank upload that has never been attached expires after seven days. Database tests cover retention and expired-path rejection. A scheduled cleanup worker, the legacy public object inventory, cropped legacy content and the full rich Mock answer-block matrix need separate acceptance. Clear detaches a reference. Existing public URLs and historical attempts are retained. |
| Orientation and account centre | **Done for the tested adult path** | Server validates MYP year, email confirmation and terms. Incomplete learners are redirected. Guardian changes invalidate verification. Chrome covered save/resume, year changes and the billing preview. Age policy, accessibility and guardian delivery remain open. [Onboarding matrix](STUDENT_ONBOARDING_TEST_MATRIX.md) |
| Google and account mail | **Blocked for end-to-end acceptance** | The hosted Auth settings endpoint returned `google:false, email:true`. Password sign-in, wrong password and sign-out passed using preconfirmed synthetic accounts. A provider-enabled first login, cancellation, duplicate/linking behavior, signup confirmation, password reset and mail receipt need approved accounts and configuration. |
| Support desk | **Done for ticket lifecycle** | Hosted Auth, PostgREST, Storage and Edge Functions exercised a question error, private screenshot, staff-only note, reply, resolution, reopen and cross-student isolation. [Support operations](SUPPORT_TICKET_FLOW.md) |
| Owner, student and welcome notifications | **Needs Verification** | Worker, outbox and delivery webhook implemented. Delivery needs a verified sender, approved test mailbox, secrets, scheduler and provider webhook registration. The reserved rehearsal mailboxes never establish delivery evidence. |
| Staff and progress reporting | **Done for core paths; Needs Verification for operational use** | Real accounts, MYP year/onboarding filters, counts, last login and auditable role changes. Practice counts use attempt states and correctness, independent of marks. Large-directory operation and the wider legacy dashboard still need acceptance. [Directory](src/components/admin/UserManagement.tsx) · [counts](supabase/migrations/20261126000600_account_activity.sql) |
| Student payments | **Deferred** | Payment Gateway & Autopay: Pending Integration. The preview has no charge, mandate, invoice or customer-portal action. [Billing preview](src/pages/Subscription.tsx) |
| Frontend hosting, physical device, release controls | **Blocked for production acceptance** | Frontend served locally against staging. No hosting release. Physical device, custom-domain routing, production auth redirect allowlists, DNS/SPF/DKIM, retention policy, guardian consent review and a tested backup restore are outstanding. |

## Evidence

- `npm test` exercised the existing Practice/equation regression suites and database-backed account, attachment, OTP, role and ticket assertions. [Database test](tests/student-readiness.test.mjs)
- `npx playwright test --config=playwright.practice.config.mjs` passed the desktop/mobile synthetic browser journey. It builds a 30-question paper over three catalogue pages, restores a draft, grades the paper and completes the support workflow. [Local suite](e2e/practice/workflows.spec.mjs)
- `node scripts/rehearse-student-staging.mjs` printed six PASS lines covering hosted password authentication, PostgREST persistence, restricted uploads, signed images, private ticket screenshots and sign-out. [Hosted API suite](scripts/rehearse-student-staging.mjs)
- `npx playwright test --config=playwright.staging.config.mjs` exercised authoring and mobile submission with real staging services. The three fixture PNGs are synthetic plotted graphs. [Hosted Chrome suite](e2e/staging/diagrams.spec.mjs)

### Recorded command output

| Command | Observed output |
|---|---|
| `npm test` | `tests 63` · `pass 63` · `fail 0` · `skipped 0` |
| `npx tsc --noEmit -p tsconfig.app.json` | Exit 0, no diagnostics |
| `npm run lint -- --quiet` | Exit 0, no lint findings |
| `npm run build` | `built in 29.66s` · Vite reported chunks larger than 500 kB and stale Browserslist data |
| `npx playwright test --config=playwright.practice.config.mjs` | `1 passed (1.8m)` |
| `npx playwright test --config=playwright.staging.config.mjs` | `1 passed (42.5s)` · 320 px layout assertion passed after refreshing the signed diagrams |

The hosted browser suite rejected SVG and oversized files, recovered from a simulated upload failure, replaced an uploaded stem and checked all three diagrams actually decoded after refresh. The local storage test exercises the seven-day orphan claim, concurrent late attachment denial and retention of attached objects. End-to-end scheduled garbage collection still needs operational verification. Screenshots use synthetic accounts and contain no credentials. [Mobile diagrams](docs/readiness-evidence/mobile-diagrams.png) · [Resolved ticket](docs/readiness-evidence/student-ticket.png)

### Delivery

GitHub denied the branch push with HTTP 403. Local commits and the binary-inclusive mailbox patch are the delivery artifacts. To apply, start a clean branch at `494716655c8f7eeb3b9c52b9bae3a1a722e25113` and run `git am /path/to/prepville-readiness-nov26.patch`.

## Security and operational boundaries

The staging Security Advisor reported RLS enabled without a policy, executable SECURITY DEFINER routines for anonymous and authenticated roles, and leaked-password protection disabled. Some guarded RPCs intentionally expose execution with internal authorization checks. Review the full grants and advisor inventory before release. The initial HTML entry loads the application module. This inspection does not cover every dependency or third-party runtime request. Raw credentials, signed URLs, session tokens and provider payloads are excluded from the reports.

For reproducible commands, environment selection and meeting narration, see the [meeting script](MEETING_DEMO_2026_11_26.md).
