# Student onboarding acceptance

| Scenario | Status | Evidence |
|---|---|---|
| Incomplete password user visits Practice | Done locally | Chrome redirects to onboarding; database trigger guards new assessment sessions. |
| Adult completes MYP profile | Done locally and via hosted API | Explicit year 1–5, adult declaration and policy acknowledgement; SQL checks confirmed Auth email. |
| Interrupted orientation | Done locally | Save through Education, reload at Guardian, complete and read school from Settings. Unsaved edits on the active step are discarded on refresh. |
| Change school or MYP year | Done locally | Browser changes year in Settings. Class or legacy onboarding flag cannot supply an authoritative year. |
| Guardian OTP | Done for database binding, needs hosted delivery verification | Account + consented address, hashed code, ten-minute expiry, bounded attempts, resend limits. Changing the address clears verification and gates assessments. |
| Underage privacy | Needs verification | Staff and student permissions, minimal contact and consent flow need jurisdiction-specific review. Guardian involvement is self-declared. A code confirms access to the mailbox. |
| Wrong password, authenticated sign-out | Done on staging | Three synthetic reserved-domain password accounts; no external mail delivery. |
| Google first/returning login, cancellation, identity linking | Blocked | Hosted Auth settings return Google disabled. Callback routes exist. No approved Google mailbox, client credentials or verified redirect allowlist. |
| Signup confirmation, duplicate signup, recovery, transactional welcome | Needs verification | Confirmation and reset use Supabase Auth. Recovery updates the signed-in user. Welcome queues on first completion. Delivery and inbox outcomes require approved mail. |
| Accessibility and device checks | Needs verification | Desktop Chrome and emulated mobile journeys. Physical device, screen reader and complete keyboard audit outstanding. |

Use the four onboarding sections to review earlier answers. Students can access support before completion. The completion timestamp and guardian verification timestamp are server-controlled. Existing students without an authoritative MYP year revisit orientation.

[Account UI](src/pages/StudentAccount.tsx) · [route guard](src/components/StudentProtectedRoute.tsx) · [guardian handler](supabase/functions/_shared/guardian.ts) · [account migration](supabase/migrations/20261126000200_student_accounts.sql) · [browser journey](e2e/practice/workflows.spec.mjs).
