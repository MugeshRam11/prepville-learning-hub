# PrepVille meeting rehearsal · 26 November

**Demo status:** local Chrome rehearsal with synthetic data; separate hosted staging backend in Mumbai. Production release is blocked. Show the IB MYP Mathematics workflow for Years 1–5. Label Google, guardian email and support notification delivery **In Progress**. Show **Payment Gateway & Autopay: Pending Integration**.

## Offline-account rehearsal

From the repository root on Windows, run:

```powershell
npx.cmd playwright test --config=playwright.practice.config.mjs --headed --workers=1
```

The runner starts Vite at `http://127.0.0.1:4178` and intercepts requests to `http://127.0.0.1:4179` inside the test browser. It uses a fresh database per run. These URLs only serve this rehearsal while the runner is active. A normal unconfigured Vite startup can select the production fallback.

1. At `/admin/practice/create`, save a question, import a CSV and approve the imported prompt.
2. At `/practice`, an unfinished synthetic account goes to `/onboarding`. Enter a name, choose MYP Year 3, refresh at Guardian, complete as an adult and acknowledge the policies.
3. Select **30 questions across three pages**, answer one, refresh, and finish. A separate single-question attempt shows the permitted solution after submission.
4. Open `/settings`, edit Learning, then show Plan & Billing. Open `/support`, submit a question-error report and switch to `/admin/support`. Reply and resolve the ticket. Return to the student timeline.
5. The browser suite also submits a synthetic Mock attempt. Rich Mock interactions have their own acceptance boundary in the parity matrix.

## Hosted backend rehearsal

The dedicated project is `eiqojioufllxcsedodnv`. Its API is `https://eiqojioufllxcsedodnv.supabase.co`. The frontend runs locally. Obtain its **publishable** key in the staging dashboard. Supply the three preconfirmed synthetic credentials through a process environment variable (`student`, `staff`, `other`). The reserved-domain accounts cannot receive mail. The commands below unlock the current Windows user’s encrypted rehearsal credentials. On another workstation, supply that environment variable from its secret store. Keep their credentials off-screen.

```powershell
$protected = (Get-Content -LiteralPath (Join-Path $env:LOCALAPPDATA 'PrepVille-staging-rehearsal.dpapi') -Raw).Trim() | ConvertTo-SecureString
$env:STAGING_SYNTHETIC_ACCOUNTS_JSON = [Net.NetworkCredential]::new('', $protected).Password
$env:STAGING_PUBLISHABLE_KEY = Read-Host 'Staging publishable key'
node scripts/rehearse-student-staging.mjs
npx.cmd playwright test --config=playwright.staging.config.mjs --headed
Remove-Item Env:STAGING_SYNTHETIC_ACCOUNTS_JSON
```

The hosted browser suite starts `http://127.0.0.1:4180/admin/practice/create` and visits the student question at `/practice/question/<question-id>`. Its plots are synthetic. The API suite checks Storage, Edge Functions, Auth and PostgREST. Each run creates rehearsal records. Ticket creation and incorrect passwords are rate-limited. Outbound mail is excluded from this rehearsal.

## Release decision

Keep production authoring closed to the meeting demo. The emergency containment script can temporarily interrupt legacy reads and writes. Production changes require owner approval, an independently verified admin roster, a tested recovery point and a migration rehearsal against the full legacy schema. DNS, hosted frontend routing, Google callback allowlists, mail ownership, guardian policy, retention and restore testing remain release gates.
