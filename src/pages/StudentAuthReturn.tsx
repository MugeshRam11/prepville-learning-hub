import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { supabaseStudent } from '@/lib/supabaseStudent';
const callbackFailed = () =>
  [location.hash.slice(1), location.search.slice(1)].some((x) =>
    new URLSearchParams(x).has('error'),
  );
export default function StudentAuthReturn({
  recovery = false,
}: {
  recovery?: boolean;
}) {
  const { user, loading } = useStudentAuth(),
    [failed] = useState(callbackFailed),
    [password, setPassword] = useState(''),
    [message, say] = useState('');
  if (loading) return <p role="status">Checking sign-in…</p>;
  if (failed || !user)
    return (
      <main>
        Sign-in was cancelled or the link has expired.{' '}
        <Link to="/login">Return to sign-in</Link>
      </main>
    );
  if (!recovery) return <Navigate to="/dashboard" replace />;
  return (
    <form
      className="mx-auto max-w-sm space-y-3 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabaseStudent.auth.updateUser({ password });
        say(error?.message ?? 'Password updated.');
        setPassword('');
      }}
    >
      <label>
        New password
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button>Save password</button>
      <p role="status">{message}</p>
      <Link to="/dashboard">Dashboard</Link>
    </form>
  );
}
