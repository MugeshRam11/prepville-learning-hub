-- Persist abuse counters independently of consent changes and challenge invalidation.
create table practice_private.guardian_delivery_log(user_id uuid not null references auth.users(id) on delete cascade, address_hash text not null, sent_at timestamptz not null default now());
create index on practice_private.guardian_delivery_log(user_id,sent_at);
create index on practice_private.guardian_delivery_log(address_hash,sent_at);
revoke all on practice_private.guardian_delivery_log from public,anon,authenticated;
create function practice_private.limit_guardian_delivery() returns trigger language plpgsql set search_path='' as $$
declare addr text:=encode(sha256(convert_to(new.email,'UTF8')),'hex');
begin
 if tg_op='UPDATE' and new.sent_at=old.sent_at then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(addr,2));
 if exists(select from practice_private.guardian_delivery_log where user_id=new.user_id and sent_at>now()-interval '1 minute')
 or (select count(*) from practice_private.guardian_delivery_log where user_id=new.user_id and sent_at>now()-interval '1 day')>=8
 or (select count(*) from practice_private.guardian_delivery_log where address_hash=addr and sent_at>now()-interval '1 day')>=12 then raise exception 'Guardian verification delivery limit reached';end if;
 delete from practice_private.guardian_delivery_log where sent_at<now()-interval '1 day';
 insert into practice_private.guardian_delivery_log(user_id,address_hash) values(new.user_id,addr);
 return new;
end $$;
create trigger guardian_delivery_limit after insert or update of sent_at on practice_private.guardian_challenges for each row execute function practice_private.limit_guardian_delivery();
create trigger practice_answer_account_required before update on public.practice_session_questions for each row execute function practice_private.require_student_account();
