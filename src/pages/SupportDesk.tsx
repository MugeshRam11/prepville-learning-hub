import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateDiagram } from '../../supabase/functions/_shared/diagram';
const db =
  supabase as unknown as import('@supabase/supabase-js').SupabaseClient;
const categories = [
    'technical',
    'account',
    'question error',
    'assessment',
    'billing inquiry',
  ],
  statuses = [
    'open',
    'in progress',
    'waiting for student',
    'resolved',
    'closed',
  ],
  priorities = ['low', 'normal', 'high'];
type Ticket = {
  id: string;
  ticket_number: number;
  category: string;
  status: string;
  subject: string;
  description: string;
  priority: string;
  updated_at: string;
  resolved_at: string | null;
  assigned_admin_id: string | null;
};
type Entry = {
  id: string;
  body?: string;
  event?: string;
  path?: string;
  is_internal_note?: boolean;
  created_at: string;
};
export default function SupportDesk({ staff = false }: { staff?: boolean }) {
  const [params, setParams] = useSearchParams(),
    id = params.get('ticket'),
    question = params.get('question'),
    studentFilter = staff ? params.get('student') : null;
  const [tickets, setTickets] = useState<Ticket[]>([]),
    [entries, setEntries] = useState<Entry[]>([]),
    [revision, bump] = useState(0),
    [loaded, ready] = useState(false);
  const [message, say] = useState(''),
    [busy, working] = useState(false),
    [body, bodySet] = useState(''),
    [subject, subjectSet] = useState(''),
    [category, categorySet] = useState(
      question
        ? 'question error'
        : params.get('category') === 'account'
          ? 'account'
          : 'technical',
    ),
    [file, fileSet] = useState<File>(),
    [address, addressSet] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
  });
  useEffect(() => {
    let live = true;
    ready(false);
    setEntries([]);
    async function load() {
      let query = db
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });
      if (studentFilter) query = query.eq('user_id', studentFilter);
      if (id) query = query.eq('id', id);
      const { data, error } = await query;
      if (error) throw error;
      let rows: Entry[] = [];
      if (id && data?.length) {
        for (const table of [
          'support_ticket_messages',
          'support_ticket_events',
          'support_ticket_attachments',
        ]) {
          const { data: items, error } = await db
            .from(table)
            .select('*')
            .eq('ticket_id', id);
          if (error) throw error;
          rows = rows.concat(items ?? []);
        }
      }
      if (live) {
        setTickets(data ?? []);
        setEntries(
          rows.sort((a, b) => a.created_at.localeCompare(b.created_at)),
        );
        ready(true);
      }
    }
    load().catch(() => {
      if (live) say('Unable to load tickets. Refresh to retry.');
    });
    return () => {
      live = false;
    };
  }, [id, revision, studentFilter]);
  useEffect(() => {
    if (staff)
      db.rpc('support_owner_email', {}).then(({ data }) =>
        addressSet(data ?? ''),
      );
  }, [staff]);
  async function run(fn: () => Promise<void>) {
    working(true);
    say('');
    try {
      await fn();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Request failed. Please retry.');
    } finally {
      working(false);
    }
  }
  async function attach(ticket: string, f: File) {
    await validateDiagram(f);
    const form = new FormData();
    form.set('ticket', ticket);
    form.set('file', f);
    const { error } = await db.functions.invoke('ticket-screenshot', {
      body: form,
    });
    if (error)
      throw Error(
        'Ticket saved. Screenshot upload failed. Select it and retry.',
      );
    fileSet(undefined);
  }
  async function act(action: string, details: Record<string, string> = {}) {
    if (file && action === 'create') await validateDiagram(file);
    const { data, error } = await db.rpc('support_action', {
      action,
      details,
      ticket: id,
    });
    if (error) throw Error(error.message);
    setParams({ ticket: data.id });
    bump((x) => x + 1);
    bodySet('');
    say('Ticket #' + data.ticket_number + ' saved.');
    if (action === 'create' && file) {
      await attach(data.id, file);
      bump((x) => x + 1);
    }
  }
  const t = id ? tickets.find((x) => x.id === id) : null;
  const list = tickets.filter(
    (t) =>
      (!filters.status || filters.status === t.status) &&
      (!filters.priority || filters.priority === t.priority) &&
      (!filters.category || filters.category === t.category),
  );
  const choose = (
    label: string,
    value: string,
    options: string[],
    change: (v: string) => void,
    all = false,
  ) => (
    <label className="grid gap-1">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => change(e.target.value)}
        className="rounded border p-2"
      >
        {all && <option value="">All</option>}
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  const screenshot = (
    <label className="grid">
      Screenshot (optional, JPEG/PNG/WebP, 5 MB)
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => fileSet(e.target.files?.[0])}
      />
    </label>
  );
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-5">
      <Link to={staff ? '/admin/dashboard' : '/dashboard'}>Dashboard</Link>
      <h1 className="text-3xl font-semibold">
        {staff ? 'Support inbox' : 'Student support'}
      </h1>
      <p role="status">{message}</p>
      {!loaded ? (
        <p>Loading tickets…</p>
      ) : (
        <fieldset disabled={busy} className="space-y-5">
          {id && (
            <Button
              variant="outline"
              onClick={() => {
                setParams({});
                bodySet('');
                fileSet(undefined);
              }}
            >
              All tickets
            </Button>
          )}
          {id && !t && <p>Ticket unavailable.</p>}
          {t && (
            <>
              <h2 className="text-xl">
                #{t.ticket_number} · {t.subject}
              </h2>
              <p>
                {t.status} · {t.category} · {t.priority} priority
              </p>
              <p className="whitespace-pre-wrap">{t.description}</p>
              <ol className="space-y-3">
                {entries.map((e) => (
                  <li key={e.id} className="rounded border p-3">
                    <small>
                      {new Date(e.created_at).toLocaleString()}{' '}
                      {e.is_internal_note && '· Internal note'}
                    </small>
                    <p className="whitespace-pre-wrap">{e.body || e.event}</p>
                    {e.path && (
                      <button
                        onClick={() =>
                          run(async () => {
                            const { data, error } = await db.storage
                              .from('support-files')
                              .createSignedUrl(e.path!, 60);
                            if (error) throw Error('Screenshot unavailable');
                            window.open(
                              data.signedUrl,
                              '_blank',
                              'noopener,noreferrer',
                            );
                          })
                        }
                      >
                        View screenshot
                      </button>
                    )}
                  </li>
                ))}
              </ol>
              <label className="grid">
                Reply
                <textarea
                  className="rounded border p-2"
                  maxLength={8000}
                  value={body}
                  onChange={(e) => bodySet(e.target.value)}
                />
              </label>
              <Button
                disabled={!body.trim()}
                onClick={() => run(() => act('reply', { body }))}
              >
                Send reply
              </Button>
              {staff && (
                <>
                  <Button
                    disabled={!body.trim()}
                    onClick={() => run(() => act('note', { body }))}
                  >
                    Add internal note
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      bodySet(
                        'Could you share the steps you followed and what you expected to see?',
                      )
                    }
                  >
                    Use troubleshooting template
                  </Button>
                  <Button onClick={() => run(() => act('assign'))}>
                    Assign to me
                  </Button>
                  {choose('Status', t.status, statuses, (status) =>
                    run(() => act('status', { status })),
                  )}
                  {choose('Priority', t.priority, priorities, (priority) =>
                    run(() => act('priority', { priority })),
                  )}
                </>
              )}
              {['resolved', 'closed'].includes(t.status) && (
                <Button onClick={() => run(() => act('reopen'))}>
                  Reopen ticket
                </Button>
              )}
              {screenshot}
              <Button
                disabled={!file}
                onClick={() =>
                  run(async () => {
                    await attach(t.id, file!);
                    bump((x) => x + 1);
                  })
                }
              >
                Add screenshot
              </Button>
            </>
          )}
          {!id && (
            <>
              {!staff && (
                <section className="grid gap-3 rounded-xl border p-4">
                  <h2>Open a ticket</h2>
                  {choose('Category', category, categories, categorySet)}
                  <label>
                    Subject
                    <Input
                      value={subject}
                      maxLength={160}
                      onChange={(e) => subjectSet(e.target.value)}
                    />
                  </label>
                  <label className="grid">
                    Description
                    <textarea
                      className="rounded border p-2"
                      value={body}
                      maxLength={8000}
                      onChange={(e) => bodySet(e.target.value)}
                    />
                  </label>
                  {screenshot}
                  <Button
                    disabled={!subject.trim() || !body.trim()}
                    onClick={() =>
                      run(() =>
                        act('create', {
                          category,
                          subject,
                          description: body,
                          question: question ?? '',
                        }),
                      )
                    }
                  >
                    Submit ticket
                  </Button>
                </section>
              )}
              {staff && (
                <>
                  <label>
                    Owner notification mailbox
                    <Input
                      type="email"
                      value={address}
                      onChange={(e) => addressSet(e.target.value)}
                    />
                  </label>
                  <Button
                    onClick={() =>
                      run(async () => {
                        const { error } = await db.rpc('support_owner_email', {
                          address,
                        });
                        if (error) throw Error(error.message);
                        say('Mailbox saved.');
                      })
                    }
                  >
                    Save mailbox
                  </Button>
                  <div className="flex flex-wrap gap-3">
                    {(['status', 'category', 'priority'] as const).map(
                      (key) => (
                        <div key={key}>
                          {choose(
                            key,
                            filters[key],
                            key === 'status'
                              ? statuses
                              : key === 'priority'
                                ? priorities
                                : categories,
                            (v) => setFilters({ ...filters, [key]: v }),
                            true,
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </>
              )}
              {staff && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const rows = [
                      ['Ticket', 'Status', 'Category', 'Priority', 'Updated'],
                      ...list.map((r) => [
                        r.ticket_number,
                        r.status,
                        r.category,
                        r.priority,
                        r.updated_at,
                      ]),
                    ];
                    const url = URL.createObjectURL(
                      new Blob([rows.map((r) => r.join(',')).join('\n')], {
                        type: 'text/csv',
                      }),
                    );
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'support-inbox.csv';
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Export filtered inbox
                </Button>
              )}
              <h2>{staff ? 'Tickets' : 'My tickets'}</h2>
              {list.length === 0 ? (
                <p>No matching tickets.</p>
              ) : (
                list.map((row) => (
                  <button
                    key={row.id}
                    className="block w-full rounded border p-3 text-left"
                    onClick={() => {
                      setParams({ ticket: row.id });
                      bodySet('');
                      fileSet(undefined);
                    }}
                  >
                    #{row.ticket_number} · {row.subject} · {row.status}
                    {staff &&
                      !['closed', 'resolved'].includes(row.status) &&
                      ' · Updated ' +
                        Math.floor(
                          (Date.now() - Date.parse(row.updated_at)) / 3600000,
                        ) +
                        'h ago'}
                  </button>
                ))
              )}
            </>
          )}
        </fieldset>
      )}
    </main>
  );
}
