create function public.my_practice_counts() returns table(answered bigint,correct bigint)
language sql stable security invoker set search_path='' as $$
 select count(*),count(*) filter(where i.is_correct)
 from public.practice_session_questions i join public.practice_sessions s on s.id=i.session_id
 where s.user_id=(select auth.uid()) and i.attempt_status in ('submitted','evaluated') and (s.session_mode='study' or s.is_completed)
$$;
revoke all on function public.my_practice_counts() from public,anon;
grant execute on function public.my_practice_counts() to authenticated;
