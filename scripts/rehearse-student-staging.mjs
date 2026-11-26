// Run only against the approved isolated rehearsal project. No outbound email steps.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const url = 'https://eiqojioufllxcsedodnv.supabase.co';
const key = process.env.STAGING_PUBLISHABLE_KEY;
const accounts = JSON.parse(
  await readFile(process.env.STAGING_SYNTHETIC_CREDENTIALS, 'utf8'),
);
const fresh = () =>
  createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
const checked = async (request) => {
  const { data, error } = await request;
  if (error) throw Error(error.message);
  return data;
};
const denied = async (request) =>
  assert.ok((await request).error, 'Expected a denial');
const clients = {};
const external = await (
  await fetch(url + '/auth/v1/settings', { headers: { apikey: key } })
).json();
console.log(
  'Hosted provider settings:',
  JSON.stringify({
    google: external.external?.google,
    email: external.external?.email,
  }),
);
for (const role of ['student', 'staff', 'other']) {
  const client = fresh();
  clients[role] = client;
  await checked(
    client.auth.signInWithPassword({
      email: 'nov26-' + role + '@example.invalid',
      password: accounts[role],
    }),
  );
}
const { student, staff, other } = clients;
await denied(
  fresh().auth.signInWithPassword({
    email: 'nov26-other@example.invalid',
    password: randomUUID(),
  }),
);
console.log(
  'PASS hosted password sign-in, wrong password and three isolated sessions',
);
const account = {
  display_name: 'Staging learner',
  myp_year: 3,
  school: 'Synthetic school',
  needs_guardian: false,
  accepted: true,
};
await checked(
  student.rpc('save_student_account', {
    details: account,
    next_step: 4,
    finish: true,
  }),
);
const stored = await checked(
  student.from('student_accounts').select('completed_at,myp_year').single(),
);
assert.ok(stored.completed_at);
assert.equal(stored.myp_year, 3);
console.log('PASS PostgREST onboarding persistence');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6x8AAAAASUVORK5CYII=',
  'base64',
);
function body(bytes, name = 'graph.png') {
  const f = new FormData();
  f.set('file', new Blob([bytes], { type: 'image/png' }), name);
  return f;
}
await denied(student.functions.invoke('question-diagram', { body: body(png) }));
await denied(
  staff.functions.invoke('question-diagram', {
    body: body(Buffer.from('<svg/>')),
  }),
);
const image = await checked(
  staff.functions.invoke('question-diagram', { body: body(png) }),
);
const path = image.ref.split('/').at(-1);
await denied(
  student.storage.from('practice-diagrams').createSignedUrl(path, 60),
);
await denied(
  student.storage
    .from('question-images')
    .upload(randomUUID() + '.png', png, { contentType: 'image/png' }),
);
await denied(
  fresh()
    .storage.from('question-images')
    .upload(randomUUID() + '.png', png, { contentType: 'image/png' }),
);
const sub = {
  label: 'a',
  marks: 1,
  answer_type: 'short_answer',
  sub_question_text: 'Read the plotted value.',
  sub_question_image_url: image.ref,
  answer_key: '3',
};
const question = {
  programme: 'MYP',
  subject: 'mathematics',
  myp_year: 'Year 3',
  strand: 'Algebra',
  topic: 'Staging graph ' + randomUUID(),
  difficulty: 'medium',
  question_type: 'multi_part',
  question_text: 'Read the graph.',
  image_url: image.ref,
  marks: 2,
  answer_type: 'short_answer',
  is_published: false,
  review_status: 'draft',
  subquestions: [sub, { ...sub, label: 'b' }],
};
const qid = await checked(
  staff.rpc('save_bank_question', { p_question: question }),
);
await denied(
  student.storage.from('practice-diagrams').createSignedUrl(path, 60),
);
await checked(
  staff
    .from('question_bank')
    .update({ is_published: true, review_status: 'approved' })
    .eq('id', qid),
);
const signed = await checked(
  student.storage.from('practice-diagrams').createSignedUrl(path, 60),
);
assert.equal((await fetch(signed.signedUrl)).status, 200);
assert.deepEqual(
  await checked(
    student.from('question_answer_keys').select('*').eq('question_id', qid),
  ),
  [],
);
console.log(
  'PASS hosted uploader, signature rejection, private draft, publication, signed reads and protected keys',
);
const [attempt] = await checked(
  student.rpc('start_single_question_attempt', { p_question_id: qid }),
);
const item = await checked(
  student
    .from('practice_session_questions')
    .select('id,prompt')
    .eq('session_id', attempt.session_id)
    .single(),
);
assert.equal(item.prompt.parts.length, 2);
assert.equal(item.prompt.parts[0].sub_question_image_url, image.ref);
await checked(
  staff
    .from('question_bank')
    .update({ is_published: false, review_status: 'archived' })
    .eq('id', qid),
);
await checked(
  student.storage.from('practice-diagrams').createSignedUrl(path, 60),
);
await denied(other.storage.from('practice-diagrams').createSignedUrl(path, 60));
console.log('PASS archived multipart diagram retained for its session owner');
const ticket = await checked(
  student.rpc('support_action', {
    action: 'create',
    details: {
      subject: 'Staging graph',
      description: 'Synthetic rehearsal',
      category: 'question error',
      question: qid,
    },
  }),
);
const shot = body(png);
shot.set('ticket', ticket.id);
const { path: attachPath } = await checked(
  student.functions.invoke('ticket-screenshot', { body: shot }),
);
await denied(
  other.storage.from('support-files').createSignedUrl(attachPath, 60),
);
assert.equal(
  (
    await fetch(
      (
        await checked(
          staff.storage.from('support-files').createSignedUrl(attachPath, 60),
        )
      ).signedUrl,
    )
  ).status,
  200,
);
for (const [action, details] of [
  ['assign', {}],
  ['note', { body: 'Staff only' }],
  ['reply', { body: 'Corrected scale' }],
  ['status', { status: 'resolved' }],
])
  await checked(
    staff.rpc('support_action', { action, details, ticket: ticket.id }),
  );
const visible = await checked(
  student
    .from('support_ticket_messages')
    .select('body')
    .eq('ticket_id', ticket.id),
);
assert.deepEqual(visible, [{ body: 'Corrected scale' }]);
assert.deepEqual(
  await checked(other.from('support_tickets').select('*').eq('id', ticket.id)),
  [],
);
await checked(
  student.rpc('support_action', {
    action: 'reopen',
    details: {},
    ticket: ticket.id,
  }),
);
console.log(
  'PASS hosted support attachment, staff response, internal note isolation, resolution and reopen',
);
await Promise.all(Object.values(clients).map((c) => checked(c.auth.signOut())));
console.log('PASS sign-out');
