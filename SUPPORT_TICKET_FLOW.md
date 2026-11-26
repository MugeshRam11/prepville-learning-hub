# Support desk operation

Students open **Support** from the dashboard, or **Report a question error** from the workspace. Each submission returns a ticket number. Staff open **Support inbox** from User management, filter by status, category or priority, assign a ticket, reply, or record an internal note. The student can reply and reopen within 14 days of resolution.

| Data | Access and behavior |
|---|---|
| Tickets | Owner and authorized staff can read. Authenticated RPC enforces mutations and five creations per account per hour. |
| Messages | Ticket owner and staff see public replies. Only staff see internal notes. Text is rendered as text. |
| Events | RPC appends creation, status, assignment and priority history. Clients have read-only access. |
| Attachments | Private bucket, reserved unique ticket path, 5 MB cap and ten reservations per hour. Owners and staff can request signed reads. The screenshot Edge Function checks content signatures and removes its reservation on a failed Storage upload. |
| Outbox | Ticket creation queues student and configured owner notices. Staff replies and status changes queue student notices. Internal notes never enqueue mail. |

Staff can move a ticket among Open, In Progress, Waiting for Student, Resolved and Closed. A student reply while waiting moves the ticket back to In Progress. Timestamps and elapsed hours support triage. Contractual SLA targets and escalations require owner agreement. The CSV export includes operational fields only.

## Email operation

1. In the admin inbox, set the approved owner mailbox. Obtain sender/domain and privacy sign-off before delivery. Verify SPF, DKIM and provider logs in staging.
2. Supply server-only `RESEND_API_KEY`, `VERIFIED_MAIL_FROM`, `SUPPORT_WORKER_SECRET`, `ADMIN_ORIGIN` and `STUDENT_ORIGIN`. Guardian verification additionally needs `GUARDIAN_OTP_SECRET`. No mailbox is preconfigured in the application.
3. Have the approved scheduler POST to `deliver-support-mail` using the worker secret. Jobs are claimed with row locks and leases. Each request uses its job UUID as provider idempotency key. An accepted provider response records its message ID. Failure backs off, up to eight claims.
4. Configure the provider webhook for `mail-events` with `RESEND_WEBHOOK_SECRET`. Signed events update delivery, bounce or complaint state. A provider acceptance alone is insufficient proof of inbox delivery. Operators inspect restricted `practice_private.support_mail` for exhausted attempts and delivery status.
5. Use the admin console for replies. Forwarding, signed inbound reply processing and a verified support inbox are pending. Messages sent by the worker contain a portal link and generic subject. Staging synthetic addresses use a reserved domain.

[Schema and RPCs](supabase/migrations/20261126000300_support_desk.sql) · [UI](src/pages/SupportDesk.tsx) · [worker](supabase/functions/deliver-support-mail/index.ts) · [signed webhook](supabase/functions/mail-events/index.ts) · [security tests](tests/student-readiness.test.mjs).
