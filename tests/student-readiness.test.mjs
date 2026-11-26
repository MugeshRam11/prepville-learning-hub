import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('student and staff workflows enforce database ownership, media access and guardian verification', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(await readFile('tests/fixtures/practice-baseline.sql', 'utf8'));
  for (const file of (await readdir('supabase/migrations'))
    .filter((x) => x >= '20260808')
    .sort())
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
  const student = randomUUID(),
    staff = randomUUID(),
    other = randomUUID();
  const query = (s, p = []) => db.query(s, p);
  const first = async (s, p) => (await query(s, p)).rows[0];
  const as = async (role, id = '') => {
    await db.exec('reset role; set role ' + role);
    await query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  };
  await query(
    "insert into auth.users(id,email) values($1,'student@example.test'),($2,'staff@example.test'),($3,'other@example.test')",
    [student, staff, other],
  );
  await query("insert into user_roles values($1,'admin')", [staff]);
  await query(
    "insert into storage.objects values('practice-diagrams','draft.png'),('question-images','old.png')",
  );
  for (const [role, id] of [
    ['anon', ''],
    ['authenticated', student],
    ['authenticated', staff],
  ]) {
    await as(role, id);
    await assert.rejects(
      query("insert into storage.objects values('question-images','new.png')"),
    );
    assert.equal(
      (
        await query(
          "delete from storage.objects where bucket_id='question-images' returning *",
        )
      ).rows.length,
      0,
    );
  }
  await as('authenticated', student);
  assert.equal(
    (await first("select can_read_diagram('draft.png') ok")).ok,
    false,
  );
  const save = (fields, finish) =>
    first('select * from save_student_account($1,3,$2)', [
      JSON.stringify(fields),
      finish,
    ]);
  const fields = {
    display_name: 'Synthetic learner',
    myp_year: 3,
    needs_guardian: true,
    guardian_consent: true,
    guardian_email: 'guardian@example.test',
    guardian_name: 'Guardian',
    relationship: 'parent',
    accepted: true,
  };
  await assert.rejects(query('update student_accounts set completed_at=now()'));
  await assert.rejects(save({ ...fields, myp_year: 6 }, false));
  await save(fields, false);
  await assert.rejects(
    save({ ...fields, guardian_verified_at: '2020-01-01' }, true),
  );
  const verify = (digest, match) =>
    first('select guardian_challenge($1,$2,$3) result', [
      student,
      digest,
      match,
    ]);
  await assert.rejects(verify('hash', false));
  await as('service_role');
  await verify('hash', false);
  await assert.rejects(verify('hash2', false));
  assert.equal((await verify('wrong', true)).result, null);
  assert.equal((await verify('hash', true)).result, fields.guardian_email);
  await as('authenticated', student);
  assert.ok((await save(fields, true)).completed_at);
  const updated = await save(
    { ...fields, guardian_email: 'new@example.test' },
    false,
  );
  assert.equal(updated.guardian_verified_at, null);
  assert.equal(updated.completed_at, null);
  const act = async (action, details = {}, ticket = null) =>
    first('select * from support_action($1,$2,$3)', [
      action,
      JSON.stringify(details),
      ticket,
    ]);
  const ticket = await act('create', {
    category: 'question error',
    subject: 'Graph',
    description: 'Labels overlap',
  });
  assert.equal(ticket.status, 'open');
  await assert.rejects(act('note', { body: 'private' }, ticket.id));
  await assert.rejects(query("select staff_set_role($1,'admin')", [student]));
  await as('authenticated', other);
  assert.equal((await query('select * from student_accounts')).rows.length, 0);
  assert.equal((await query('select * from support_tickets')).rows.length, 0);
  await assert.rejects(act('reply', { body: 'Other' }, ticket.id));
  await as('authenticated', staff);
  await act('assign', {}, ticket.id);
  await act('note', { body: 'Private staff observation' }, ticket.id);
  await act('reply', { body: 'Corrected label' }, ticket.id);
  await act('status', { status: 'resolved' }, ticket.id);
  await query("select support_owner_email('owner@example.test')");
  await as('authenticated', student);
  assert.deepEqual(
    (await query('select body from support_ticket_messages')).rows,
    [{ body: 'Corrected label' }],
  );
  assert.equal((await act('reopen', {}, ticket.id)).status, 'open');
  const path = (
    await first("select reserve_support_attachment($1,'image/png',30) path", [
      ticket.id,
    ])
  ).path;
  await assert.rejects(
    query("insert into storage.objects values('support-files',$1)", [path]),
  );
  await as('postgres');
  await query("insert into storage.objects values('support-files',$1)", [path]);
  await as('authenticated', other);
  assert.equal(
    (
      await query(
        "select * from storage.objects where bucket_id='support-files'",
      )
    ).rows.length,
    0,
  );
  await as('service_role');
  const jobs = (await query('select * from claim_support_mail()')).rows;
  assert.ok(jobs.some((j) => j.recipient === 'owner@example.test'));
  assert.ok(jobs.some((j) => j.recipient === 'student@example.test'));
  assert.equal(
    (await query('select * from claim_support_mail()')).rows.length,
    0,
  );
  assert.ok(jobs.some((j) => j.audience === 'welcome'));
  await as('postgres');
  await query(
    "update practice_private.guardian_delivery_log set sent_at=now()-interval '1 day'",
  );
  await as('service_role');
  await verify('expired', false);
  await as('postgres');
  await query('delete from practice_private.guardian_delivery_log');
  await query(
    "update practice_private.guardian_challenges set sent_at=now()-interval '12 minutes'",
  );
  await as('service_role');
  assert.equal((await verify('expired', true)).result, null);
  await as('postgres');
  const retained = 'bank/' + randomUUID() + '.png',
    orphan = 'bank/' + randomUUID() + '.png';
  for (const path of [retained, orphan])
    await query('select register_bank_upload($1)', [path]);
  await query(
    "update practice_private.pending_diagrams set created_at=now()-interval '8 days'",
  );
  await query('insert into mock_tests(id,is_published) values($1,false)', [
    other,
  ]);
  await query(
    'insert into mock_questions(id,mock_test_id,question_image_url) values($1,$2,$3)',
    [randomUUID(), other, '/practice-diagrams/' + retained + '#alt=Graph'],
  );
  assert.deepEqual(
    (await query('select claim_abandoned_diagrams() path')).rows,
    [{ path: orphan }],
  );
  await assert.rejects(
    query(
      'insert into mock_questions(id,mock_test_id,question_image_url) values($1,$2,$3)',
      [randomUUID(), other, '/practice-diagrams/' + orphan],
    ),
  );
  await query('select finish_diagram_cleanup($1::text[])', [[orphan]]);
  assert.deepEqual(
    (await query('select path,state from practice_private.pending_diagrams'))
      .rows,
    [{ path: retained, state: 'attached' }],
  );
  await db.exec(
    "create function public.make_user_admin(text) returns void language sql as 'select'; grant execute on function public.make_user_admin(text) to public,anon,authenticated;",
  );
  await db.exec(
    await readFile('supabase/emergency/contain_authoring.sql', 'utf8'),
  );
  assert.equal(
    (
      await first(
        "select has_function_privilege('anon','public.make_user_admin(text)','execute') allowed",
      )
    ).allowed,
    false,
  );
  await as('authenticated', staff);
  await assert.rejects(
    query('insert into mock_tests values($1,true)', [randomUUID()]),
  );
});
