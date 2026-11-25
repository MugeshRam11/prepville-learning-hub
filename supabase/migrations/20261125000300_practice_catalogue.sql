create view public.practice_catalogue with (security_invoker=true) as
select q.id,q.question_text,q.image_url,q.topic,q.subtopic,q.strand,q.myp_year,q.difficulty,q.question_type,
 q.marks,q.created_at,q.search_document,
 coalesce(h.attempt_status,'unattempted') as attempt_status,h.is_correct
from public.question_bank q left join (
 select distinct on (sq.question_id) sq.question_id,sq.attempt_status,sq.is_correct
 from public.practice_sessions s join public.practice_session_questions sq on sq.session_id=s.id
 where s.user_id=(select auth.uid()) and sq.attempt_status<>'unattempted'
 order by sq.question_id,(sq.attempt_status in ('evaluated','submitted')) desc,sq.updated_at desc,sq.id
) h on h.question_id=q.id
where q.programme='MYP' and q.subject='mathematics' and q.is_published and q.review_status='approved' and q.myp_year is not null;
grant select on public.practice_catalogue to authenticated;
