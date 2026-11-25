alter table public.practice_sessions add column evaluation_status text generated always as
(case when not is_completed then 'in_progress' when score is null then 'pending' else 'evaluated' end) stored;
grant select on public.question_bank,public.question_subquestions,public.question_answer_keys to authenticated;
-- Preserve only the configured student input contract in published question payloads.
create function practice_private.valid_answer_config(config jsonb) returns boolean language plpgsql immutable strict set search_path='' as $$
begin
 if jsonb_typeof(config)<>'object' or config-'options'-'tolerance'<>'{}' then return false; end if;
 if config ? 'tolerance' and (jsonb_typeof(config->'tolerance')<>'number' or (config->>'tolerance')::numeric<0) then return false; end if;
 if config ? 'options' then
   if jsonb_typeof(config->'options')<>'array' then return false; end if;
   return not exists(select from jsonb_array_elements(config->'options') opt where jsonb_typeof(opt)<>'object'
     or opt-'id'-'content'<>'{}' or nullif(trim(opt->>'id'),'') is null or nullif(trim(opt->>'content'),'') is null)
     and (select count(*)=count(distinct opt->>'id') from jsonb_array_elements(config->'options') opt);
 end if;
 return true;
end $$;
alter table public.question_bank add constraint practice_safe_config check(practice_private.valid_answer_config(answer_config)) not valid;
alter table public.question_subquestions add constraint practice_safe_part_config check(practice_private.valid_answer_config(answer_config)) not valid;
