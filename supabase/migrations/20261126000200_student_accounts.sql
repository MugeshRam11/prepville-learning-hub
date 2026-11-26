create table public.student_accounts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', programme text not null default 'MYP' check(programme='MYP'),
 subject text not null default 'mathematics' check(subject='mathematics'), myp_year smallint check(myp_year between 1 and 5),
 school text, country text, timezone text, phone text, academic_year text, goals text, difficulty text,
 needs_guardian boolean, guardian_name text, relationship text, guardian_email text, guardian_phone text,
 guardian_consent boolean not null default false, guardian_verified_at timestamptz, email_opt_in boolean not null default false,
 step smallint not null default 1 check(step between 1 and 4), terms_version text, acknowledged_at timestamptz, completed_at timestamptz);
alter table public.student_accounts enable row level security;
revoke all on public.student_accounts from public,anon,authenticated;
grant select on public.student_accounts to authenticated;
create policy own_account on public.student_accounts for select to authenticated using(user_id=(select auth.uid()));
create function public.save_student_account(details jsonb, next_step integer, finish boolean default false) returns public.student_accounts
language plpgsql security definer set search_path='' as $$
declare a public.student_accounts; old_addr text; old_consent boolean; uid uuid:=auth.uid();
begin
 if uid is null then raise insufficient_privilege; end if;
 if length(details::text)>12000 then raise exception 'Account details too long'; end if;
 insert into public.student_accounts(user_id) values(uid) on conflict do nothing;
 select * into strict a from public.student_accounts where user_id=uid for update;
 old_addr:=a.guardian_email; old_consent:=a.guardian_consent;
 a.display_name:=trim(coalesce(details->>'display_name','')); a.myp_year:=nullif(details->>'myp_year','')::smallint;
 a.school:=details->>'school'; a.country:=details->>'country'; a.timezone:=details->>'timezone'; a.phone:=details->>'phone';
 a.academic_year:=details->>'academic_year'; a.goals:=details->>'goals'; a.difficulty:=details->>'difficulty';
 a.needs_guardian:=(details->>'needs_guardian')::boolean; a.email_opt_in:=coalesce((details->>'email_opt_in')::boolean,false);
 a.guardian_consent:=coalesce(a.needs_guardian and (details->>'guardian_consent')::boolean,false);
 a.guardian_email:=case when a.guardian_consent then nullif(lower(trim(details->>'guardian_email')),'') end;
 if a.guardian_email is not null and a.guardian_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Enter a valid guardian email'; end if;
 a.guardian_name:=case when a.guardian_consent then details->>'guardian_name' end;
 a.guardian_phone:=case when a.guardian_consent then details->>'guardian_phone' end;
 a.relationship:=case when a.guardian_consent then details->>'relationship' end;
 if old_addr is distinct from a.guardian_email or not old_consent or not a.guardian_consent then a.guardian_verified_at:=null; delete from practice_private.guardian_challenges where user_id=uid; end if;
 if a.needs_guardian is distinct from false and a.guardian_verified_at is null then a.completed_at:=null; end if;
 if a.display_name='' or a.myp_year is null then a.completed_at:=null; end if;
 if finish then
   if a.display_name='' or a.myp_year is null or a.needs_guardian is null or
      (a.needs_guardian and (a.guardian_verified_at is null or coalesce(trim(a.guardian_name),'')='' or coalesce(trim(a.relationship),'')='')) or
      (details->>'accepted') is distinct from 'true' or not exists(select from auth.users where id=uid and email_confirmed_at is not null)
   then raise exception 'Confirm student email, required details, applicable guardian verification and terms'; end if;
   a.terms_version:='2026-11'; a.acknowledged_at:=now(); a.completed_at:=coalesce(a.completed_at,now());
 end if;
 update public.student_accounts set (display_name,myp_year,school,country,timezone,phone,academic_year,goals,difficulty,needs_guardian,guardian_consent,guardian_email,guardian_name,guardian_phone,relationship,guardian_verified_at,email_opt_in,step,terms_version,acknowledged_at,completed_at)=
 (a.display_name,a.myp_year,a.school,a.country,a.timezone,a.phone,a.academic_year,a.goals,a.difficulty,a.needs_guardian,a.guardian_consent,a.guardian_email,a.guardian_name,a.guardian_phone,a.relationship,a.guardian_verified_at,a.email_opt_in,next_step,a.terms_version,a.acknowledged_at,a.completed_at) where user_id=uid returning * into a;
 return a;
end $$;
revoke all on function public.save_student_account(jsonb,integer,boolean) from public,anon;
grant execute on function public.save_student_account(jsonb,integer,boolean) to authenticated;
create table practice_private.guardian_challenges(user_id uuid primary key references auth.users(id) on delete cascade,email text not null,digest text not null,sent_at timestamptz not null,tries integer not null default 0);
revoke all on practice_private.guardian_challenges from public,anon,authenticated;
create function public.guardian_challenge(p_user uuid,p_digest text,p_verify boolean) returns text language plpgsql security definer set search_path='' as $$
declare a public.student_accounts; c practice_private.guardian_challenges;
begin
 select * into strict a from public.student_accounts where user_id=p_user for update;
 if not a.guardian_consent or a.guardian_email is null or a.guardian_verified_at is not null then raise exception 'No pending guardian verification'; end if;
 select * into c from practice_private.guardian_challenges where user_id=p_user;
 if p_verify then
  if c.user_id is null or c.email<>a.guardian_email or c.tries>=5 or now()>c.sent_at+interval '10 minutes' then return null; end if;
  update practice_private.guardian_challenges set tries=tries+1 where user_id=p_user;
  if c.digest<>p_digest then return null; end if;
  update public.student_accounts set guardian_verified_at=now() where user_id=p_user;
  delete from practice_private.guardian_challenges where user_id=p_user;
 else
  if now()<c.sent_at+interval '1 minute' then raise exception 'Please wait before resending'; end if;
  insert into practice_private.guardian_challenges values(p_user,a.guardian_email,p_digest,now(),0)
  on conflict(user_id) do update set email=excluded.email,digest=excluded.digest,sent_at=excluded.sent_at,tries=0;
 end if;
 return a.guardian_email;
end $$;
revoke all on function public.guardian_challenge(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.guardian_challenge(uuid,text,boolean) to service_role;
