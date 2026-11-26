create table public.support_tickets(
 id uuid primary key default gen_random_uuid(),ticket_number bigint generated always as identity unique,
 user_id uuid not null references auth.users(id),category text not null check(category in ('technical','account','question error','assessment','billing inquiry')),
 subject text not null check(length(trim(subject)) between 1 and 160),description text not null check(length(trim(description)) between 1 and 8000),
 priority text not null default 'normal' check(priority in ('low','normal','high')), status text not null default 'open' check(status in ('open','in progress','waiting for student','resolved','closed')),
 assigned_admin_id uuid references auth.users(id),related_question_id uuid,related_session_id uuid,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),resolved_at timestamptz);
create index support_by_student on public.support_tickets(user_id,updated_at desc);
create index support_by_status on public.support_tickets(status,updated_at desc);
create table public.support_ticket_messages(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id),actor_id uuid not null,is_internal_note boolean not null default false,body text not null check(length(trim(body)) between 1 and 8000),created_at timestamptz not null default now());
create table public.support_ticket_events(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id),actor_id uuid not null,event text not null,created_at timestamptz not null default now());
create table public.support_ticket_attachments(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id),uploaded_by uuid not null,path text unique not null,content_type text not null,bytes integer not null,created_at timestamptz not null default now());
create table practice_private.support_mail(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id),audience text not null,attempts int not null default 0,available_at timestamptz default now(),sent_at timestamptz,provider_id text,last_error text);
create table practice_private.support_config(singleton boolean primary key default true check(singleton),owner_email text);
revoke all on practice_private.support_mail,practice_private.support_config from public,anon,authenticated;
create function public.support_staff() returns boolean language sql stable set search_path='' as $$ select public.has_role(auth.uid(),'admin'::text) $$;
do $$ declare t text; begin
 foreach t in array array['support_tickets','support_ticket_messages','support_ticket_events','support_ticket_attachments'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 if t<>'support_tickets' then
 execute format('create index on public.%I(ticket_id,created_at)',t);
 execute format('create policy visible_ticket on public.%I for select to authenticated using(exists(select from public.support_tickets t where t.id=ticket_id) %s)',t,case when t='support_ticket_messages' then 'and (not is_internal_note or public.support_staff())' else '' end);
 end if;
 end loop;
end $$;
create policy own_tickets on public.support_tickets for select to authenticated using(user_id=(select auth.uid()) or (select public.support_staff()));
create function public.support_action(action text,details jsonb,ticket uuid default null) returns public.support_tickets language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); staff boolean:=public.support_staff(); t public.support_tickets; event_label text; dest text; note boolean:=action='note';
begin
 if uid is null then raise insufficient_privilege; end if;
 if action='create' then
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  if (select count(*) from public.support_tickets where user_id=uid and created_at>now()-interval '1 hour')>=5 then raise exception 'Hourly ticket limit reached'; end if;
  insert into public.support_tickets(user_id,category,subject,description,related_question_id,related_session_id)
  values(uid,details->>'category',details->>'subject',details->>'description',nullif(details->>'question','')::uuid,nullif(details->>'session','')::uuid) returning * into t;
  event_label:='Ticket opened';
  insert into practice_private.support_mail(ticket_id,audience) values(t.id,'owner'),(t.id,'student');
 else
  select * into t from public.support_tickets where id=ticket for update;
  if t.id is null or (not staff and t.user_id<>uid) then raise insufficient_privilege; end if;
  if action in ('reply','note') then
   if (note and not staff) or t.status='closed' then raise insufficient_privilege; end if;
   insert into public.support_ticket_messages(ticket_id,actor_id,is_internal_note,body) values(t.id,uid,note,details->>'body');
   if not note then
    dest:=case when staff then 'student' else 'owner' end;
    if not staff and t.status='waiting for student' then t.status:='in progress';event_label:='Student replied · in progress';end if;
   end if;
  elsif action='status' then
   if not staff then raise insufficient_privilege; end if;
   t.status:=details->>'status'; t.resolved_at:=case when t.status in ('resolved','closed') then coalesce(t.resolved_at,now()) end;
   event_label:='Status: '||t.status;dest:='student';
  elsif action='reopen' and t.status in ('resolved','closed') and t.resolved_at>now()-interval '14 days' then
   t.status:='open';t.resolved_at:=null;event_label:='Ticket reopened';dest:='owner';
  elsif action='assign' and staff then
   t.assigned_admin_id:=uid;event_label:='Assigned to staff';
  elsif action='priority' and staff then
   t.priority:=details->>'priority';event_label:='Priority: '||t.priority;
  else raise insufficient_privilege;
  end if;
  if dest is not null then insert into practice_private.support_mail(ticket_id,audience) values(t.id,dest); end if;
  update public.support_tickets set status=t.status,resolved_at=t.resolved_at,assigned_admin_id=t.assigned_admin_id,priority=t.priority,updated_at=now() where id=t.id returning * into t;
 end if;
 if event_label is not null then insert into public.support_ticket_events(ticket_id,actor_id,event) values(t.id,uid,event_label); end if;
 return t;
end $$;
create function public.support_owner_email(address text default null) returns text language plpgsql security definer set search_path='' as $$
begin
 if not public.support_staff() then raise insufficient_privilege;end if;
 if address is not null then
 if address !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Invalid mailbox';end if;
 insert into practice_private.support_config values(true,lower(trim(address))) on conflict(singleton) do update set owner_email=excluded.owner_email;
 end if;return(select owner_email from practice_private.support_config);
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('support-files','support-files',false,5242880,array['image/jpeg','image/png','image/webp']);
create function public.reserve_support_attachment(ticket uuid,mime text,size_bytes integer) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); key text:=ticket::text||'/'||gen_random_uuid()::text;
begin
 if uid is null or not exists(select from public.support_tickets where id=ticket and (user_id=uid or public.support_staff()) and status<>'closed') then raise insufficient_privilege;end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,1));
 if mime not in ('image/png','image/jpeg','image/webp') or size_bytes not between 1 and 5242880 or (select count(*) from public.support_ticket_attachments where uploaded_by=uid and created_at>now()-interval '1 hour')>=10 then raise exception 'Screenshot type, size or upload limit exceeded';end if;
 insert into public.support_ticket_attachments(ticket_id,uploaded_by,path,content_type,bytes) values(ticket,uid,key,mime,size_bytes);
 return key;
end $$;
create policy support_file_read_guard on storage.objects as restrictive for select using(bucket_id<>'support-files' or exists(select from public.support_ticket_attachments where path=name));
create policy support_file_read on storage.objects for select to authenticated using(bucket_id='support-files' and exists(select from public.support_ticket_attachments where path=name));
create policy support_file_insert_guard on storage.objects as restrictive for insert with check(bucket_id<>'support-files' or exists(select from public.support_ticket_attachments where path=name and uploaded_by=auth.uid() and created_at>now()-interval '10 minutes'));
create policy support_file_insert on storage.objects for insert to authenticated with check(bucket_id='support-files' and exists(select from public.support_ticket_attachments where path=name and uploaded_by=auth.uid()));
create policy support_file_update_guard on storage.objects as restrictive for update using(bucket_id<>'support-files') with check(bucket_id<>'support-files');
create policy support_file_delete_guard on storage.objects as restrictive for delete using(bucket_id<>'support-files');
revoke all on function public.support_action(text,jsonb,uuid),public.support_owner_email(text),public.reserve_support_attachment(uuid,text,integer) from public,anon;
grant execute on function public.support_action(text,jsonb,uuid),public.support_owner_email(text),public.reserve_support_attachment(uuid,text,integer) to authenticated;
