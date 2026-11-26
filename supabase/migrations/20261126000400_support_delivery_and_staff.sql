create function public.claim_support_mail() returns table(job_id uuid,recipient text,audience text,ticket_id uuid) language sql security definer set search_path='' as $$
 with selected as (select m.id from practice_private.support_mail m where m.sent_at is null and m.attempts<8 and m.available_at<=now() order by m.available_at for update skip locked limit 10),
 jobs as (update practice_private.support_mail m set attempts=attempts+1,available_at=now()+interval '10 minutes' from selected s where s.id=m.id returning m.*)
 select j.id,case when j.audience='owner' then (select owner_email from practice_private.support_config) else u.email end,j.audience,j.ticket_id
 from jobs j join public.support_tickets t on t.id=j.ticket_id join auth.users u on u.id=t.user_id
$$;
create function public.finish_support_mail(job uuid,delivery text,failure text) returns void language sql security definer set search_path='' as $$
 update practice_private.support_mail set sent_at=case when delivery is not null then now() end,provider_id=delivery,last_error=left(failure,100),
 available_at=now()+interval '1 minute'*power(2,attempts) where id=job and sent_at is null
$$;
revoke all on function public.claim_support_mail(),public.finish_support_mail(uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_support_mail(),public.finish_support_mail(uuid,text,text) to service_role;
create table practice_private.role_audit(id uuid primary key default gen_random_uuid(),actor uuid not null,target uuid not null,assigned_role text not null,created_at timestamptz not null default now());
revoke all on practice_private.role_audit from public,anon,authenticated;
create function public.staff_set_role(target uuid,new_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.support_staff() or target=auth.uid() or new_role not in ('student','admin') then raise insufficient_privilege; end if;
 perform 1 from auth.users where id=target for update;
 if not found then raise exception 'Unknown account'; end if;
 delete from public.user_roles where user_id=target and role::text in ('student','admin');
 insert into public.user_roles(user_id,role) select target,r.role from jsonb_populate_record(null::public.user_roles,jsonb_build_object('role',new_role)) r;
 insert into practice_private.role_audit(actor,target,assigned_role) values(auth.uid(),target,new_role);
end $$;
create function public.staff_directory() returns table(user_id uuid,email text,display_name text,role text,myp_year smallint,completed_at timestamptz,practice_sessions bigint,support_tickets bigint,last_activity timestamptz,disabled boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.support_staff() then raise insufficient_privilege; end if;
 return query select u.id,u.email::text,coalesce(nullif(a.display_name,''),to_jsonb(p)->>'first_name'),case when public.has_role(u.id,'admin'::text) then 'admin' else 'student' end,
 a.myp_year,a.completed_at,(select count(*) from public.practice_sessions s where s.user_id=u.id),(select count(*) from public.support_tickets t where t.user_id=u.id),
 nullif(to_jsonb(u)->>'last_sign_in_at','')::timestamptz,coalesce(nullif(to_jsonb(u)->>'banned_until','')::timestamptz>now(),false)
 from auth.users u left join public.student_accounts a on a.user_id=u.id left join public.profiles p on p.id=u.id order by u.email;
end $$;
revoke all on function public.staff_directory(),public.staff_set_role(uuid,text) from public,anon;
grant execute on function public.staff_directory(),public.staff_set_role(uuid,text) to authenticated;
