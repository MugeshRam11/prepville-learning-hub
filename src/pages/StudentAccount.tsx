import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { supabaseStudent as client } from '@/lib/supabaseStudent';
import AvatarCustomizer from '@/components/student/AvatarCustomizer';
import Subscription from './Subscription';
const db = client as unknown as import('@supabase/supabase-js').SupabaseClient;
const sections = ['Account', 'Education', 'Guardian', 'Confirmation'];
type Fields = {
  display_name: string;
  myp_year: string;
  school: string;
  country: string;
  timezone: string;
  phone: string;
  academic_year: string;
  goals: string;
  difficulty: string;
  needs_guardian: boolean | null;
  guardian_consent: boolean;
  guardian_email: string;
  guardian_phone: string;
  guardian_name: string;
  relationship: string;
  email_opt_in: boolean;
  accepted: boolean;
  guardian_verified_at?: string;
  completed_at?: string;
  step?: number;
};
const blank: Fields = {
  display_name: '',
  myp_year: '',
  school: '',
  country: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  phone: '',
  academic_year: '',
  goals: '',
  difficulty: '',
  needs_guardian: null,
  guardian_consent: false,
  guardian_email: '',
  guardian_phone: '',
  guardian_name: '',
  relationship: '',
  email_opt_in: false,
  accepted: false,
};
export default function StudentAccount({
  settings = false,
}: {
  settings?: boolean;
}) {
  const { user, signOut, resetPassword } = useStudentAuth(),
    navigate = useNavigate();
  const [avatarPicker, setAvatarPicker] = useState(false);
  const [fields, setFields] = useState<Fields>(blank),
    [step, setStep] = useState(1),
    [loaded, ready] = useState(false),
    [busy, working] = useState(false),
    [message, say] = useState(''),
    [code, setCode] = useState(''),
    [email, setEmail] = useState('');
  useEffect(() => {
    let current = true;
    if (user)
      db.from('student_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!current) return;
          if (error) {
            say('Account could not be loaded. Refresh to retry.');
            return;
          }
          if (data) {
            setFields({ ...blank, ...data, accepted: !!data.acknowledged_at });
            if (!settings) setStep(data.step);
          }
          ready(true);
        });
    return () => {
      current = false;
    };
  }, [user?.id, settings]);
  const [history, setHistory] = useState<
    { id: string; title: string; created_at: string }[]
  >([]);
  const [historyError, setHistoryError] = useState(false);
  useEffect(() => {
    let active = true;
    if (settings && step === 2 && user)
      db.from('practice_sessions')
        .select('id,title,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data, error }) => {
          if (active) {
            setHistory(data ?? []);
            setHistoryError(!!error);
          }
        });
    return () => {
      active = false;
    };
  }, [settings, step, user?.id]);
  const change = (key: keyof Fields, value: string | boolean) =>
    setFields((prev) => ({ ...prev, [key]: value }));
  const input = (key: keyof Fields, label: string, type = 'text') => (
    <label className="grid gap-1">
      {label}
      <Input
        type={type}
        value={String(fields[key] ?? '')}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  async function save(next: number, finish = false) {
    const { data, error } = await db.rpc('save_student_account', {
      details: fields,
      next_step: Math.min(next, 4),
      finish,
    });
    if (error) throw Error(error.message);
    setFields({ ...blank, ...data, accepted: !!data.acknowledged_at });
    setStep(next);
    say('Changes saved.');
    if (finish) navigate('/dashboard', { replace: true });
  }
  async function run(action: () => Promise<void>) {
    working(true);
    say('');
    try {
      await action();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Request failed. Please retry.');
    } finally {
      working(false);
    }
  }
  async function otp(verify: boolean) {
    await save(3);
    const { error } = await client.functions.invoke(
      verify ? 'verify-otp' : 'send-otp',
      { body: { code } },
    );
    if (error)
      throw Error(
        'Verification failed. Check the code or retry after one minute.',
      );
    if (verify) {
      await save(3);
      setCode('');
    }
    say(verify ? 'Guardian email verified.' : 'Verification code sent.');
  }
  const tabs = settings
    ? [
        'Profile',
        'Learning',
        'Guardian',
        'Preferences',
        'Security',
        'Plan & Billing',
      ]
    : sections;
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-5 sm:p-10">
      <header>
        <Link to="/dashboard">PrepVille Learning Hub</Link>
        <h1 className="mt-5 text-3xl font-semibold">
          {settings ? 'Account settings' : 'Welcome to PrepVille'}
        </h1>
      </header>
      <nav aria-label="Account sections" className="flex flex-wrap gap-2">
        {tabs.map((t, i) => (
          <Button
            key={t}
            variant={step === i + 1 ? 'default' : 'outline'}
            disabled={busy || !loaded}
            aria-current={step === i + 1 ? 'step' : undefined}
            onClick={() => setStep(i + 1)}
          >
            {t}
          </Button>
        ))}
      </nav>
      <p role="status">{message}</p>
      {loaded && (
        <fieldset disabled={busy} className="space-y-4 rounded-xl border p-5">
          <legend className="px-2 font-semibold">{tabs[step - 1]}</legend>
          {step === 1 && (
            <>
              <p>
                {user?.email} ·{' '}
                {user?.email_confirmed_at ? 'Verified' : 'Verification pending'}
              </p>
              <p>Login method: {user?.app_metadata.provider ?? 'Email'}</p>
              {input('display_name', 'Student name')}
              <Button variant="outline" onClick={() => setAvatarPicker(true)}>
                Choose avatar
              </Button>
              {avatarPicker && (
                <AvatarCustomizer
                  currentAvatar=""
                  onClose={() => setAvatarPicker(false)}
                  onSave={(avatar) =>
                    run(async () => {
                      const { error } = await db.rpc('save_student_avatar', {
                        avatar,
                      });
                      if (error) throw Error(error.message);
                      setAvatarPicker(false);
                      say('Avatar saved.');
                    })
                  }
                />
              )}
              {input('country', 'Country')}
              {input('timezone', 'Time zone')}
              {input('phone', 'Phone (optional)', 'tel')}
            </>
          )}
          {step === 2 && (
            <>
              <p>IB Middle Years Programme · Mathematics</p>
              <label>
                MYP year
                <select
                  className="block rounded border p-2"
                  value={fields.myp_year ?? ''}
                  onChange={(e) => change('myp_year', e.target.value)}
                >
                  <option value="">Select a year</option>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </label>
              {input('school', 'School (optional)')}
              {input('academic_year', 'Academic year')}
              {input('goals', 'Learning goals')}
              {input('difficulty', 'Preferred difficulty')}
              {settings && (
                <section>
                  <h2>Recent practice</h2>
                  {historyError
                    ? 'Could not load practice history.'
                    : history.length
                      ? history.map((h) => (
                          <Link
                            className="block underline"
                            key={h.id}
                            to={'/practice/session/' + h.id}
                          >
                            {h.title} ·{' '}
                            {new Date(h.created_at).toLocaleDateString()}
                          </Link>
                        ))
                      : 'No practice sessions yet.'}
                </section>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <label>
                Guardian involvement
                <select
                  className="block rounded border p-2"
                  value={String(fields.needs_guardian)}
                  onChange={(e) =>
                    change('needs_guardian', e.target.value === 'true')
                  }
                >
                  <option disabled value="null">
                    Choose an option
                  </option>
                  <option value="true">
                    I need parent or guardian consent
                  </option>
                  <option value="false">I am an adult acting for myself</option>
                </select>
              </label>
              {fields.needs_guardian && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={fields.guardian_consent}
                      onChange={(e) =>
                        change('guardian_consent', e.target.checked)
                      }
                    />{' '}
                    I have permission to use these details for guardian
                    verification.
                  </label>
                  {fields.guardian_consent && (
                    <>
                      {input('guardian_name', 'Guardian name')}
                      {input('relationship', 'Relationship')}
                      {input('guardian_email', 'Guardian email', 'email')}
                      {input(
                        'guardian_phone',
                        'Guardian phone (optional)',
                        'tel',
                      )}
                      <Button onClick={() => run(() => otp(false))}>
                        Send verification code
                      </Button>
                      <label>
                        Verification code
                        <Input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                        />
                      </label>
                      <Button onClick={() => run(() => otp(true))}>
                        Verify code
                      </Button>
                      <p>
                        {fields.guardian_verified_at
                          ? 'Verified at last save'
                          : 'Verification pending'}
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <p>
                {fields.display_name} · MYP Mathematics · Year{' '}
                {fields.myp_year || 'pending'}
              </p>
              <p>
                {fields.school}{' '}
                {fields.needs_guardian
                  ? '· Guardian verification ' +
                    (fields.guardian_verified_at ? 'confirmed' : 'pending')
                  : ''}
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={fields.email_opt_in}
                  onChange={(e) => change('email_opt_in', e.target.checked)}
                />{' '}
                Email me learning updates
              </label>
              {!settings && (
                <>
                  <p>
                    Free preview. Open Practice to try a question or build a
                    paper. Support is available from your dashboard.
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={fields.accepted}
                      onChange={(e) => change('accepted', e.target.checked)}
                    />{' '}
                    I acknowledge the{' '}
                    <a href="/privacy" target="_blank" rel="noreferrer">
                      privacy policy
                    </a>{' '}
                    and{' '}
                    <a href="/terms" target="_blank" rel="noreferrer">
                      terms
                    </a>
                    .
                  </label>
                </>
              )}
            </>
          )}
          {step === 5 && (
            <>
              <p>Signed in as {user?.email}</p>
              <Button
                onClick={() =>
                  run(async () => {
                    const { error } = await resetPassword(user!.email!);
                    if (error) throw error;
                    say('Check your inbox for a password reset link.');
                  })
                }
              >
                Request password reset
              </Button>
              <label>
                New account email
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <Button
                onClick={() =>
                  run(async () => {
                    const { error } = await client.auth.updateUser({ email });
                    if (error) throw error;
                    say('Check your inbox for confirmation.');
                  })
                }
              >
                Request email change
              </Button>
              <Link to="/support?category=account">
                Request account or data deletion
              </Link>
            </>
          )}
          {step === 6 && <Subscription />}
          {step <= 4 && (
            <Button
              onClick={() =>
                run(() =>
                  save(
                    settings ? step : Math.min(4, step + 1),
                    !settings && step === 4,
                  ),
                )
              }
            >
              {settings
                ? 'Save changes'
                : step === 4
                  ? 'Complete onboarding'
                  : 'Save and continue'}
            </Button>
          )}
        </fieldset>
      )}
      <footer className="flex gap-4">
        <Link to="/support">Get support</Link>
        <button onClick={() => signOut()}>Sign out</button>
      </footer>
    </main>
  );
}
