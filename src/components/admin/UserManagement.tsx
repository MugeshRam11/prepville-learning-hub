import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
const db =
  supabase as unknown as import('@supabase/supabase-js').SupabaseClient;
type Account = {
  user_id: string;
  display_name: string | null;
  email: string;
  role: string;
  myp_year: number | null;
  completed_at: string | null;
  disabled: boolean;
  practice_sessions: number;
  support_tickets: number;
  last_activity: string | null;
};
export default function UserManagement() {
  const [rows, setRows] = useState<Account[]>([]),
    [search, find] = useState(''),
    [year, setYear] = useState(''),
    [status, setStatus] = useState(''),
    [error, say] = useState(''),
    [loading, wait] = useState(true),
    [refresh, bump] = useState(0),
    [selected, select] = useState('');
  useEffect(() => {
    let live = true;
    wait(true);
    db.rpc('staff_directory').then(({ data, error }) => {
      if (live) {
        say(error ? 'Unable to load student directory.' : '');
        setRows(data ?? []);
        wait(false);
      }
    });
    return () => {
      live = false;
    };
  }, [refresh]);
  const filtered = rows.filter(
    (r) =>
      (!year || String(r.myp_year) === year) &&
      (!status || (status === 'complete') === !!r.completed_at) &&
      [r.display_name, r.email]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const detail = rows.find((r) => r.user_id === selected);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">User management</h1>
      <Link to="/admin/support">Support inbox</Link>
      <Input
        aria-label="Search accounts"
        placeholder="Name or email"
        value={search}
        onChange={(e) => find(e.target.value)}
      />
      <label>
        MYP year{' '}
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label>
        {' '}
        Onboarding{' '}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="complete">Complete</option>
          <option value="pending">Pending</option>
        </select>
      </label>
      {error && (
        <p role="alert">
          {error} <button onClick={() => bump((n) => n + 1)}>Retry</button>
        </p>
      )}
      {loading ? (
        <p>Loading accounts…</p>
      ) : !error && !filtered.length ? (
        <p>No matching accounts.</p>
      ) : (
        filtered.map((r) => (
          <button
            key={r.user_id}
            className="block w-full rounded border p-3 text-left"
            onClick={() => select(r.user_id)}
          >
            {r.display_name || r.email} · {r.role} ·{' '}
            {r.disabled ? 'Disabled' : 'Active'}
          </button>
        ))
      )}
      {detail && (
        <section className="space-y-2 rounded border p-4">
          <h2>{detail.email}</h2>
          <p>
            Year {detail.myp_year || 'pending'} · Onboarding{' '}
            {detail.completed_at ? 'complete' : 'pending'}
          </p>
          <p>
            {detail.practice_sessions} practice sessions ·{' '}
            <Link to={'/admin/support?student=' + detail.user_id}>
              {detail.support_tickets} support tickets
            </Link>
          </p>
          <p>
            Last sign-in:{' '}
            {detail.last_activity
              ? new Date(detail.last_activity).toLocaleString()
              : 'Unavailable'}
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              const role = detail.role === 'admin' ? 'student' : 'admin';
              if (
                !window.confirm(
                  'Assign ' + role + ' access to ' + detail.email + '?',
                )
              )
                return;
              const { error } = await db.rpc('staff_set_role', {
                target: detail.user_id,
                new_role: role,
              });
              if (error) say('Role change denied.');
              else bump((n) => n + 1);
            }}
          >
            Change role
          </Button>
        </section>
      )}
    </section>
  );
}
