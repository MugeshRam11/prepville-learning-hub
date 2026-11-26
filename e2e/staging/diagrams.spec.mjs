import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
test('staff publishes plotted multipart algebra and mobile learner submits it on hosted staging', async ({
  browser,
}) => {
  const url = 'https://eiqojioufllxcsedodnv.supabase.co',
    topic = 'Graph rehearsal ' + randomUUID().slice(0, 8);
  const passwords = JSON.parse(
    process.env.STAGING_SYNTHETIC_ACCOUNTS_JSON,
  );
  async function login(role, width) {
    const client = createClient(url, process.env.STAGING_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: 'nov26-' + role + '@example.invalid',
      password: passwords[role],
    });
    expect(error).toBeNull();
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    await context.addInitScript(
      (session) =>
        localStorage.setItem(
          'sb-eiqojioufllxcsedodnv-auth-token',
          JSON.stringify(session),
        ),
      data.session,
    );
    await context.route('**/*', (route) =>
      [url, 'http://127.0.0.1:4180'].includes(
        new URL(route.request().url()).origin,
      )
        ? route.continue()
        : route.abort(),
    );
    return { page: await context.newPage(), client };
  }
  const { page, client } = await login('staff', 1280);
  await page.goto('/admin/practice/create');
  await page.getByRole('button', { name: 'New Question', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByRole('combobox').filter({ hasText: 'Year 4' }).click();
  await page.getByRole('option', { name: 'Year 3', exact: true }).click();
  await form
    .getByPlaceholder('e.g. Linear Equations and Inequalities')
    .fill(topic);
  await form
    .getByRole('textbox', { name: 'Question Text with Math' })
    .fill('Compare the three linear graphs.');
  const picker=form.locator('input[type=file]').first();
  await picker.setInputFiles({name:'wrong.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
  await expect(form.getByRole('alert')).toContainText('matching extension');
  await picker.setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024+1)});
  await expect(form.getByRole('alert')).toContainText('5 MB');
  await page.route('**/functions/v1/question-diagram',route=>route.fulfill({status:503,body:'test interruption'}),{times:1});
  await picker.setInputFiles('e2e/fixtures/algebra-part-b.png');
  await form.getByRole('button',{name:'Retry upload'}).click();
  const urlField=form.getByLabel('Image URL',{exact:true});
  await expect(urlField).toHaveValue(/practice-diagrams/);
  const previous=await urlField.inputValue();
  await form
    .locator('input[type=file]')
    .first()
    .setInputFiles('e2e/fixtures/algebra-stem.png');
  await expect(form.getByLabel('Image URL', { exact: true })).toHaveValue(
    /practice-diagrams/,
  );
  await expect(urlField).not.toHaveValue(previous);
  await form
    .getByLabel('Diagram description')
    .fill('Line through (0,1) and (1,2)');
  await form.getByRole('switch').first().click();
  await form.getByRole('button', { name: 'Add Part' }).click();
  for (const [i, label] of ['a', 'b'].entries()) {
    await form
      .getByRole('textbox', { name: 'Subquestion (' + label + ') text' })
      .fill('What is the y-intercept of this line?');
    await form
      .getByLabel('Part (' + label + ') Answer Key', { exact: true })
      .locator('..')
      .getByRole('button', { name: 'Edit LaTeX source' })
      .click();
    await form
      .getByLabel('Part (' + label + ') Answer Key source')
      .fill(String(i + 2));
    await form
      .locator('input[type=file]')
      .nth(i + 1)
      .setInputFiles('e2e/fixtures/algebra-part-' + label + '.png');
    await expect(form.getByLabel('Part image URL').nth(i)).toHaveValue(
      /practice-diagrams/,
    );
    await form
      .getByLabel('Diagram description')
      .nth(i + 1)
      .fill('Line crossing y at ' + (i + 2));
  }
  await form.getByRole('button', { name: 'Save to Question Bank' }).click();
  const row = page.getByRole('row').filter({ hasText: topic });
  await expect(row).toBeVisible();
  await page.reload();
  await row.getByTitle('Preview question').click();
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(3);
  await page.getByRole('button', { name: 'Close Preview' }).click();
  await row
    .getByRole('button', { name: 'Approve and publish question' })
    .click();
  await expect(
    row.getByRole('button', { name: 'Unpublish question' }),
  ).toBeVisible();
  const { data: q } = await client
    .from('question_bank')
    .select('id')
    .eq('topic', topic)
    .single();
  const { page: learner, client: student } = await login('student', 320);
  await learner.goto('/practice/question/' + q.id);
  await expect(
    learner.getByRole('img', { name: 'Line crossing y at 3' }),
  ).toBeVisible();
  await learner.getByRole('button', { name: 'Enlarge Part a diagram' }).click();
  await expect(learner.getByRole('dialog')).toBeVisible();
  await learner.keyboard.press('Escape');
  const editors = learner.getByRole('textbox', {
    name: 'Mathematical solution editor',
  });
  await editors.nth(0).fill('2');
  await editors.nth(1).fill('3');
  await expect
    .poll(async () => {
      const { data } = await student
        .from('practice_session_questions')
        .select('attempt_status')
        .eq('question_id', q.id);
      return data?.some((r) => r.attempt_status === 'draft');
    })
    .toBe(true);
  await learner.reload();
  await expect(editors.nth(1)).toHaveValue('3');
  await expect
    .poll(() =>
      learner
        .locator('button[aria-label^="Enlarge"] img')
        .evaluateAll(
          (images) =>
            images.filter((img) => img.complete && img.naturalWidth > 0).length,
        ),
    )
    .toBe(3);
  expect(
    await learner.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await expect(learner.getByText('Failed to load streak data')).toHaveCount(0, {
    timeout: 15000,
  });
  await learner.screenshot({
    path: 'test-results-staging/hosted-mobile-diagrams.png',
    fullPage: true,
  });
  await learner
    .getByRole('button', { name: 'Submit Answer', exact: true })
    .click();
  await expect(
    learner.getByText('Answer Key', { exact: true }).first(),
  ).toBeVisible();
  await page.context().close();
  await learner.context().close();
});
