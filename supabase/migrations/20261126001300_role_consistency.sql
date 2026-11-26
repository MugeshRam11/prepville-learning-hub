-- Keep legacy profile readers and authoritative role assignments in agreement.
create or replace function public.staff_set_role(target uuid,new_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.support_staff() or target=auth.uid() or new_role is null or new_role not in ('student','admin') then raise insufficient_privilege; end if;
 perform 1 from auth.users where id=target for update;
 if not found then raise exception 'Unknown account'; end if;
 delete from public.user_roles where user_id=target and role::text in ('student','admin');
 insert into public.user_roles(user_id,role) select target,r.role from jsonb_populate_record(null::public.user_roles,jsonb_build_object('role',new_role)) r;
 update public.profiles set role=(jsonb_populate_record(null::public.profiles,jsonb_build_object('role',new_role))).role where id=target;
 insert into practice_private.role_audit(actor,target,assigned_role) values(auth.uid(),target,new_role);
end $$;
