create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,anon;
alter default privileges in schema public grant all on tables to authenticated,anon;
create type app_role as enum('admin','student');
create table profiles(id uuid primary key, role text);
create table user_roles(user_id uuid,role app_role,primary key(user_id,role));
alter table user_roles enable row level security;
create table mock_tests(id uuid primary key,is_published boolean);
create table mock_test_sections(id uuid,mock_test_id uuid);
create table mock_questions(id uuid primary key,mock_test_id uuid,question_number int,question_text text,question_image_url text,has_sub_questions boolean,marks int,word_limit int,difficulty text,created_at timestamptz,updated_at timestamptz,answer_key text);
create table mock_sub_questions(id uuid,question_id uuid,sub_question_label text,sub_question_text text,sub_question_image_url text,marks int,word_limit int,created_at timestamptz,answer_key text);
create table practice_sets(id uuid primary key,topic text,difficulty text,is_published boolean,is_archived boolean,created_by uuid,created_at timestamptz default now(),updated_at timestamptz default now());
create table practice_questions(id uuid primary key,practice_set_id uuid,question_text text,question_image_url text);
create table practice_sub_questions(id uuid,question_id uuid,label text,marks int,answer_type text,answer_block_config jsonb,command_term text,sub_question_text text,sub_question_image_url text,order_index int,created_at timestamptz,updated_at timestamptz,answer_key text,solution text);
create function update_updated_at_column() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
insert into practice_sets(id,topic,difficulty,is_published,is_archived) values('00000000-0000-0000-0000-000000000011','Geometry','easy',true,false);
insert into practice_questions values(gen_random_uuid(),'00000000-0000-0000-0000-000000000011','Legacy prompt',null);


create policy "Users can view sections of published tests" on mock_test_sections for select using(true);
create policy "Users can view published mock questions" on mock_questions for select using(true);
create policy "Users can view published mock sub questions" on mock_sub_questions for select using(true);
create policy "Users can view sub questions of published sets" on practice_sub_questions for select using(true);
