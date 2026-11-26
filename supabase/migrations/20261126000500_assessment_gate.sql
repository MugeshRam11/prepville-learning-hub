create function practice_private.require_student_account() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.support_staff() and not exists(select from public.student_accounts where user_id=auth.uid() and completed_at is not null)
 then raise exception 'Complete onboarding before starting an assessment'; end if;
 return new;
end $$;
create trigger practice_account_required before insert on public.practice_sessions for each row execute function practice_private.require_student_account();
do $$ begin
 if to_regclass('public.test_attempts') is not null then
 create trigger mock_account_required before insert on public.test_attempts for each row execute function practice_private.require_student_account();
 end if;
end $$;
