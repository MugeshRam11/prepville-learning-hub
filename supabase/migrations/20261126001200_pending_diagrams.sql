-- Track newly staged bank uploads only. An object that has ever been attached is retained.
create table practice_private.pending_diagrams(path text primary key check(path ~ '^bank/[0-9a-f-]{36}[.](png|jpg|webp)$'), created_at timestamptz not null default now(), state text not null default 'pending' check(state in ('pending','attached','removing')));
revoke all on practice_private.pending_diagrams from public,anon,authenticated;
create function public.register_bank_upload(path text) returns void language sql security definer set search_path='' as $$
 insert into practice_private.pending_diagrams(path) values(path)
$$;
create function practice_private.retain_bank_upload() returns trigger language plpgsql security definer set search_path='' as $$
declare object_name text; current_state text;
begin
 for object_name in select distinct m[1] from regexp_matches(to_jsonb(new)::text,'/practice-diagrams/(bank/[0-9a-f-]{36}[.](?:png|jpg|webp))','g') m order by 1 loop
 select state into current_state from practice_private.pending_diagrams where path=object_name for update;
 if not found or current_state='removing' then raise exception 'Diagram expired. Upload it again.'; end if;
 if current_state='pending' then update practice_private.pending_diagrams set state='attached' where path=object_name; end if;
 end loop;return new;
end $$;
do $$ declare t text;begin
 foreach t in array array['question_bank','question_subquestions','question_answer_keys','mock_questions','mock_sub_questions','practice_questions','practice_sub_questions','practice_session_questions','subject_questions'] loop
 if to_regclass('public.'||t) is not null then execute format('create trigger retain_bank_upload before insert or update on public.%I for each row execute function practice_private.retain_bank_upload()',t);end if;
 end loop;
end $$;
create function public.claim_abandoned_diagrams() returns setof text language sql security definer set search_path='' as $$
 with expired as (select path from practice_private.pending_diagrams where state in ('pending','removing') and created_at<now()-interval '7 days' order by created_at for update skip locked limit 50)
 update practice_private.pending_diagrams d set state='removing' from expired e where d.path=e.path returning d.path
$$;
create function public.finish_diagram_cleanup(paths text[]) returns void language sql security definer set search_path='' as $$
 delete from practice_private.pending_diagrams where state='removing' and path=any(paths)
$$;
revoke all on function public.register_bank_upload(text),public.claim_abandoned_diagrams(),public.finish_diagram_cleanup(text[]) from public,anon,authenticated;
grant execute on function public.register_bank_upload(text),public.claim_abandoned_diagrams(),public.finish_diagram_cleanup(text[]) to service_role;
