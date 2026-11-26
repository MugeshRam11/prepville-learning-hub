create function public.save_student_avatar(avatar integer) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); addr text;
begin
 if uid is null or avatar not in (1,2,3,6,7,8,9,10,12,14) or avatar is null then raise insufficient_privilege; end if;
 select email into strict addr from auth.users where id=uid;
 insert into public.profiles(id,email,avatar_id,avatar_emoji) values(uid,addr,avatar,case avatar when 7 then '🐍' when 8 then '⚛️' when 9 then '∑' when 10 then '💻' when 12 then '🧠' when 14 then '⚙️' end)
 on conflict(id) do update set avatar_id=excluded.avatar_id,avatar_emoji=excluded.avatar_emoji,avatar_name=null;
end $$;
revoke all on function public.save_student_avatar(integer) from public,anon;
grant execute on function public.save_student_avatar(integer) to authenticated;
