import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('admin CSV import and publication, mobile selection, draft resume and paper submission',async ({page,context})=>{
  const db=new PGlite();
  const admin=randomUUID(),student=randomUUID();
  try {
    await db.exec(await readFile('tests/fixtures/practice-baseline.sql','utf8'));
    for(const file of (await readdir('supabase/migrations')).filter(f=>f>='20260808').sort())
      await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
    await db.query('insert into auth.users values ($1),($2)',[admin,student]);
    await db.query("insert into user_roles values ($1,'admin')",[admin]);
    await db.exec('set role authenticated');
    const login=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
    await login(admin);
    const mock=randomUUID();
    await db.query('insert into mock_tests values($1,true)',[mock]);
    await db.query("insert into mock_questions(id,mock_test_id,question_number,question_text,marks,answer_key) values(gen_random_uuid(),$1,1,'Synthetic mock prompt',2,'3')",[mock]);
    let mockAttempt, mockEvaluation;

    const fixture={programme:'MYP',subject:'mathematics',myp_year:'Year 2',strand:'Algebra',topic:'Linear equations',
      difficulty:'medium',question_type:'single',marks:2,answer_type:'short_answer',answer_key:'3',is_published:true,review_status:'approved'};
    for(let n=1;n<=29;n++) await db.query('select save_bank_question($1)',[JSON.stringify({...fixture,question_text:'Solve equation '+n})]);
    await context.addInitScript(({admin,student})=>{
      const id=location.pathname.startsWith('/admin') ? admin : student;
      const user={id,aud:'authenticated',role:'authenticated',email:id+'@example.test',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
      const exp=Math.floor(Date.now()/1000)+3600;
      const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:id,role:'authenticated',exp}))+'.c3ludGhldGlj';
      localStorage.setItem('sb-127-auth-token',JSON.stringify({user,access_token:token,refresh_token:'fixture',token_type:'bearer',expires_at:exp,expires_in:3600}));
    },{admin,student});
    // Exercise actual migrations through a local adapter for the PostgREST requests in this journey.
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin==='http://127.0.0.1:4178') return route.continue();
      if(url.origin!=='http://127.0.0.1:4179') return route.abort();
      const path=url.pathname.replace('/rest/v1/',''), req=route.request(),params=url.searchParams;
      const body=req.postDataJSON() || {};
      let data=[],total;
      try {
        if(path==='/auth/v1/user') data={id:student,role:'authenticated',aud:'authenticated',user_metadata:{},app_metadata:{}};
        if(path==='mock_tests') data={id:mock,title:'Synthetic mock exam',subject:'mathematics',topic:'Algebra'};
        if(path==='rpc/student_mock_prompts') data=(await db.query("select student_mock_prompts($1::uuid[]) as prompt",[body.p_tests])).rows.map(r=>r.prompt);
        if(path==='test_attempts' && req.method()==='POST') { mockAttempt={...body,id:randomUUID()}; data=mockAttempt; }
        if(path==='exam_evaluations' && req.method()==='POST') mockEvaluation=body;
        if(path==='rpc/start_single_question_attempt') data=(await db.query('select * from start_single_question_attempt($1)',[body.p_question_id])).rows;
        if(path==='rpc/submit_practice_question_answer') data=(await db.query('select * from submit_practice_question_answer($1,$2,$3)',[body.p_session_question_id,body.p_answer,body.p_time_spent_seconds])).rows;
        if(path==='student_accounts') data=(await db.query('select * from student_accounts where user_id=$1',[student])).rows;
        if(path==='rpc/save_student_account') data=(await db.query('select * from save_student_account($1,$2,$3)',[JSON.stringify(body.details),body.next_step,body.finish])).rows[0];
        if(path==='rpc/support_action') data=(await db.query('select * from support_action($1,$2,$3)',[body.action,JSON.stringify(body.details),body.ticket])).rows[0];
        if(path==='rpc/support_owner_email') data=(await db.query('select support_owner_email($1) address',[body.address ?? null])).rows[0].address;
        if(['support_tickets','support_ticket_events','support_ticket_messages','support_ticket_attachments'].includes(path)){
          const key=path==='support_tickets'?'id':'ticket_id',value=params.get(key)?.slice(3);
          data=(await db.query('select * from '+path+(value?' where '+key+'=$1':''),value?[value]:[])).rows;
        }
        if(path==='user_roles') data=(await db.query("select role from user_roles where user_id=$1 and role='admin'",[params.get('user_id').slice(3)])).rows;
        if(path==='rpc/save_bank_question') data=(await db.query('select save_bank_question($1,$2,$3) id',[JSON.stringify(body.p_question),body.p_id,body.p_batch])).rows[0].id;
        if(path==='question_bank' && req.method()==='PATCH') await db.query('update question_bank set review_status=$1,is_published=$2 where id=$3',[body.review_status,body.is_published,params.get('id').slice(3)]);
        if(path==='question_bank' && req.method()==='GET') data=(await db.query('select * from question_bank order by created_at desc limit 20')).rows;
        if(path==='question_answer_keys') data=(await db.query('select * from question_answer_keys')).rows;
        if(path==='practice_catalogue') {
          const graded=params.has('is_correct');
          data=(await db.query('select * from practice_catalogue '+(graded?'where is_correct is not null ':'')+'order by created_at desc,id')).rows;
          total=data.length;
          const offset=Number(params.get('offset') || 0);
          data=data.slice(offset,offset+Number(params.get('limit') || 12));
        }
        if(path==='rpc/generate_practice_session') data=(await db.query('select * from generate_practice_session($1,$2,$3)',[body.p_title,body.p_count,JSON.stringify(body.p_filters)])).rows;
        if(path==='practice_sessions') data=(await db.query('select * from practice_sessions where id=$1',[params.get('id')?.slice(3)])).rows[0] || [];
        if(path==='practice_session_questions') data=(await db.query('select * from practice_session_questions where session_id=$1 order by order_index',[params.get('session_id').slice(3)])).rows;
        if(path==='rpc/save_practice_draft_answer') {
          await db.query('select save_practice_draft_answer($1,$2,$3)',[body.p_session_question_id,body.p_answer,body.p_time_spent_seconds]); data=true;
        }
        if(path==='rpc/complete_practice_session') data=(await db.query('select * from complete_practice_session($1)',[body.p_session_id])).rows;
        if(path==='rpc/get_practice_question_solution') data=(await db.query('select * from get_practice_question_solution($1)',[body.p_session_question_id])).rows;
        await route.fulfill({json:data,headers:{'content-range':'0-0/'+(total ?? data?.length ?? 1),'access-control-expose-headers':'content-range'}});
      } catch(e) {await route.fulfill({status:400,json:{message:e.message,code:e.code}});}
    });
    await page.goto('/admin/practice/create');
    await expect(page.getByText('Question Bank Management')).toBeVisible();
    await page.getByRole('button',{name:'New Question',exact:true}).click();
    await page.getByPlaceholder('e.g. Linear Equations and Inequalities').fill('Draft topic');
    await page.getByRole('textbox',{name:'Question Text with Math'}).fill('Simplify $x+x$');
    await page.getByRole('button',{name:'Save to Question Bank'}).click();
    await expect.poll(async ()=>(await db.query("select review_status from question_bank where topic='Draft topic'")).rows[0]?.review_status).toBe('draft');
    await page.getByRole('button',{name:'Bulk Import (CSV)'}).click();
    await page.locator('input[type=file]').setInputFiles({name:'questions.csv',mimeType:'text/csv',
      buffer:Buffer.from('programme,subject,myp_year,strand,topic,difficulty,question_text,marks,answer_key,solution\nMYP,mathematics,Year 2,Algebra,Imported topic,easy,Find three,2,3,Count to three')});
    await page.getByRole('dialog').getByRole('button',{name:/import.*valid|import.*question/i}).last().click();
    await expect(page.getByText(/Imported 1/).first()).toBeVisible();
    await page.keyboard.press('Escape');
    const imported=page.getByRole('row').filter({hasText:'Imported topic'});
    await imported.getByRole('button',{name:/publish/i}).click();
    await expect.poll(async ()=>(await db.query("select is_published from question_bank where topic='Imported topic'")).rows[0]?.is_published).toBe(true);
    await login(student);
    await page.setViewportSize({width:390,height:844});
    await page.goto('/practice');
    await expect(page).toHaveURL(/onboarding/);
    await page.getByLabel('Student name').fill('Demo learner');
    await page.getByRole('button',{name:'Save and continue'}).click();
    await page.getByLabel('MYP year').selectOption('3');
    await page.getByLabel('School (optional)').fill('Synthetic school');
    await page.getByRole('button',{name:'Save and continue'}).click();
    await page.reload();
    await page.getByLabel('Guardian involvement').selectOption('false');
    await page.getByRole('button',{name:'Save and continue'}).click();
    await page.getByRole('checkbox',{name:/acknowledge/}).check();
    await page.getByRole('button',{name:'Complete onboarding'}).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto('/practice');
    await expect(page.getByText('Showing 12 of 30 approved questions')).toBeVisible();
    for (const [idx,count] of [12,12,6].entries()) {
      const boxes=page.getByRole('checkbox');
      await expect(boxes).toHaveCount(count);
      for(let i=0;i<count;i++) await boxes.nth(i).check();
      await expect(page.getByText((idx===2?30:12*(idx+1))+' of 50 selected')).toBeVisible();
      if(idx<2) {
        await page.getByRole('button',{name:'Next',exact:true}).click();
        await expect(boxes.first()).not.toBeChecked();
      }
    }
    await page.getByRole('button',{name:'Create Practice Paper',exact:true}).click();
    const editor=page.getByRole('textbox',{name:'Mathematical solution editor'});
    await editor.fill('3');
    await expect.poll(async ()=>(await db.query("select count(*) n from practice_session_questions where attempt_status='draft'")).rows[0].n).toBe(1);
    await page.reload();
    await expect(editor).toHaveValue('3');
    await page.getByRole('button',{name:'Complete Session'}).click();
    await page.getByRole('button',{name:'Yes, Finish & Score'}).click();
    await expect(page.getByText('Practice Session Summary')).toBeVisible();
    await expect(page.getByText('3%',{exact:true})).toBeVisible();
    await page.goto('/practice');
    await page.getByRole('button',{name:'Start Practice'}).first().click();
    await editor.fill('3');
    await page.getByRole('button',{name:'Submit Answer',exact:true}).click();
    await expect(page.getByText('Answer Key',{exact:true})).toBeVisible();
    await page.setViewportSize({width:1280,height:900});
    await page.goto('/mock-exams/unified/'+mock);
    await page.getByRole('button',{name:/Enter Fullscreen/}).click();
    await expect(page.getByText('Synthetic mock prompt').first()).toBeVisible();
    await page.getByRole('button',{name:'Submit',exact:true}).click();
    await page.getByRole('button',{name:'Submit Exam',exact:true}).click();
    await expect(page).toHaveURL(/mock-exams\/submitted/);
    expect(mockAttempt.test_id).toBe(mock);
    expect(mockEvaluation.test_attempt_id).toBe(mockAttempt.id);

    await page.goto('/settings');
    await page.getByRole('button',{name:'Learning',exact:true}).click();
    await expect(page.getByLabel('School (optional)')).toHaveValue('Synthetic school');
    await page.getByLabel('MYP year').selectOption('4');
    await page.getByRole('button',{name:'Save changes'}).click();
    await expect(page.getByRole('status').filter({hasText:'Changes saved'})).toBeVisible();
    await page.getByRole('button',{name:'Plan & Billing'}).click();
    await expect(page.getByText(/Pending Integration/)).toBeVisible();
    await page.goto('/support');
    await page.getByLabel('Subject').fill('Graph scale');
    await page.getByLabel('Description').fill('Synthetic diagram needs a scale.');
    await page.getByRole('button',{name:'Submit ticket'}).click();
    await expect(page.getByRole('heading',{name:/Graph scale/})).toBeVisible();
    const ticketUrl=page.url();
    await login(admin);await page.goto('/admin/support');
    await page.getByRole('button',{name:/Graph scale/}).click();
    await page.getByLabel('Reply',{exact:true}).fill('Scale corrected.');
    await page.getByRole('button',{name:'Send reply'}).click();
    await expect(page.getByText('Scale corrected.',{exact:true})).toBeVisible();
    await page.getByLabel('Status',{exact:true}).selectOption('resolved');
    await expect(page.getByText('Status: resolved')).toBeVisible();
    await login(student);await page.goto(ticketUrl);
    await expect(page.getByText('Scale corrected.',{exact:true})).toBeVisible();
    await expect(page.getByText('Status: resolved')).toBeVisible();
    await page.screenshot({path:'test-results/synthetic-support.png',fullPage:true});
  } finally {await db.close();}
});
