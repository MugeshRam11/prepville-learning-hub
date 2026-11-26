alter table practice_private.support_mail alter column ticket_id drop not null;
alter table practice_private.support_mail add column welcome_user_id uuid unique references auth.users(id) on delete cascade,
 add column delivery_status text, add column delivery_updated_at timestamptz;
alter table practice_private.support_mail add constraint notification_subject check(
 (ticket_id is not null and welcome_user_id is null and audience in ('owner','student')) or
 (ticket_id is null and welcome_user_id is not null and audience='welcome'));
create function practice_private.queue_welcome() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.completed_at is not null and old.completed_at is null then
 insert into practice_private.support_mail(welcome_user_id,audience) values(new.user_id,'welcome') on conflict(welcome_user_id) do nothing;
 end if;return new;
end $$;
create trigger first_completed_account after update of completed_at on public.student_accounts for each row execute function practice_private.queue_welcome();
create or replace function public.claim_support_mail() returns table(job_id uuid,recipient text,audience text,ticket_id uuid) language sql security definer set search_path='' as $$
 with selected as (select m.id from practice_private.support_mail m where m.sent_at is null and m.attempts<8 and m.available_at<=now() order by m.available_at for update skip locked limit 10),
 jobs as (update practice_private.support_mail m set attempts=attempts+1,available_at=now()+interval '10 minutes' from selected s where s.id=m.id returning m.*)
 select j.id,case when j.audience='owner' then (select owner_email from practice_private.support_config) else u.email end,j.audience,j.ticket_id
 from jobs j left join public.support_tickets t on t.id=j.ticket_id join auth.users u on u.id=coalesce(j.welcome_user_id,t.user_id)
$$;
create index on practice_private.support_mail(provider_id) where provider_id is not null;
create function public.record_mail_event(provider text,event_name text,event_at timestamptz) returns void language sql security definer set search_path='' as $$
 update practice_private.support_mail set delivery_status=event_name,delivery_updated_at=event_at
 where provider_id=provider and (delivery_updated_at is null or delivery_updated_at<event_at)
$$;
revoke all on function public.record_mail_event(text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_mail_event(text,text,timestamptz) to service_role;
