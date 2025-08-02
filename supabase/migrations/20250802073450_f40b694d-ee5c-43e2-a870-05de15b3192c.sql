-- Create enums for user roles and message types
CREATE TYPE user_role_sg AS ENUM ('student', 'admin', 'moderator');
CREATE TYPE group_member_role AS ENUM ('member', 'moderator');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'audio');

-- Create study_groups_users table (extending the existing profiles functionality)
CREATE TABLE public.study_groups_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  role user_role_sg NOT NULL DEFAULT 'student',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  streak_days INTEGER NOT NULL DEFAULT 0,
  reputation INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create groups table
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  member_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  role group_member_role NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(group_id, user_id)
);

-- Create study_questions table
CREATE TABLE public.study_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  asked_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  answer_count INTEGER NOT NULL DEFAULT 0,
  upvotes INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create study_answers table
CREATE TABLE public.study_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.study_questions(id) ON DELETE CASCADE NOT NULL,
  answered_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create group_messages table
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  message_type message_type NOT NULL DEFAULT 'text',
  file_url TEXT,
  reply_to UUID REFERENCES public.group_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE
);

-- Create streaks table
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'login',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date, activity_type)
);

-- Enable RLS on all tables
ALTER TABLE public.study_groups_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_groups_users
CREATE POLICY "Users can view all study group users" ON public.study_groups_users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own study group profile" ON public.study_groups_users
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study group profile" ON public.study_groups_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for study_groups
CREATE POLICY "Anyone can view public groups" ON public.study_groups
  FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create groups" ON public.study_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" ON public.study_groups
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for group_members
CREATE POLICY "Members can view group membership" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON public.group_members
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for study_questions
CREATE POLICY "Group members can view questions" ON public.study_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = study_questions.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Group members can ask questions" ON public.study_questions
  FOR INSERT WITH CHECK (
    auth.uid() = asked_by AND
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = study_questions.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Question authors can update their questions" ON public.study_questions
  FOR UPDATE USING (auth.uid() = asked_by);

-- RLS Policies for study_answers
CREATE POLICY "Group members can view answers" ON public.study_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_questions sq 
      JOIN public.group_members gm ON gm.group_id = sq.group_id
      WHERE sq.id = study_answers.question_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Group members can post answers" ON public.study_answers
  FOR INSERT WITH CHECK (
    auth.uid() = answered_by AND
    EXISTS (
      SELECT 1 FROM public.study_questions sq 
      JOIN public.group_members gm ON gm.group_id = sq.group_id
      WHERE sq.id = study_answers.question_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Answer authors can update their answers" ON public.study_answers
  FOR UPDATE USING (auth.uid() = answered_by);

-- RLS Policies for group_messages
CREATE POLICY "Group members can view messages" ON public.group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_messages.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Group members can send messages" ON public.group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_messages.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Message senders can update their messages" ON public.group_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- RLS Policies for user_streaks
CREATE POLICY "Users can view their own streaks" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions to update counts and reputation
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    UPDATE public.study_groups 
    SET member_count = member_count + 1
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE public.study_groups 
      SET member_count = member_count - 1
      WHERE id = NEW.group_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE public.study_groups 
      SET member_count = member_count + 1
      WHERE id = NEW.group_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
    UPDATE public.study_groups 
    SET member_count = member_count - 1
    WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.study_questions 
    SET answer_count = answer_count + 1
    WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.study_questions 
    SET answer_count = answer_count - 1
    WHERE id = OLD.question_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reputation when answer is verified
  IF TG_OP = 'UPDATE' AND OLD.is_verified = false AND NEW.is_verified = true THEN
    UPDATE public.study_groups_users 
    SET reputation = reputation + 50
    WHERE user_id = NEW.answered_by;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_verified = true AND NEW.is_verified = false THEN
    UPDATE public.study_groups_users 
    SET reputation = reputation - 50
    WHERE user_id = NEW.answered_by;
  END IF;
  
  -- Update reputation when upvotes change
  IF TG_OP = 'UPDATE' AND OLD.upvotes != NEW.upvotes THEN
    UPDATE public.study_groups_users 
    SET reputation = reputation + ((NEW.upvotes - OLD.upvotes) * 10)
    WHERE user_id = NEW.answered_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_group_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

CREATE TRIGGER update_answer_count_trigger
  AFTER INSERT OR DELETE ON public.study_answers
  FOR EACH ROW EXECUTE FUNCTION update_answer_count();

CREATE TRIGGER update_user_reputation_trigger
  AFTER UPDATE ON public.study_answers
  FOR EACH ROW EXECUTE FUNCTION update_user_reputation();

-- Create indexes for better performance
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_study_questions_group_id ON public.study_questions(group_id);
CREATE INDEX idx_study_answers_question_id ON public.study_answers(question_id);
CREATE INDEX idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX idx_user_streaks_user_id ON public.user_streaks(user_id);
CREATE INDEX idx_study_groups_users_reputation ON public.study_groups_users(reputation DESC);
CREATE INDEX idx_study_groups_users_streak ON public.study_groups_users(streak_days DESC);