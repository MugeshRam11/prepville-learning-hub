alter table public.question_bank add column search_document tsvector generated always as
(to_tsvector('simple',topic || ' ' || question_text || ' ' || coalesce(subtopic,'') || ' ' || coalesce(command_term,''))) stored;
create index practice_question_text_idx on public.question_bank using gin(search_document);
create index practice_catalog_order_idx on public.question_bank(created_at desc,id) where is_published and review_status='approved';

