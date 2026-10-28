-- Migration: Create Coach tables (conversations, messages, usage)
-- Created at: 2026-10-28

-- 1. coach_conversations
CREATE TABLE IF NOT EXISTS public.coach_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. coach_messages
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. coach_usage
CREATE TABLE IF NOT EXISTS public.coach_usage (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_in  INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_usage ENABLE ROW LEVEL SECURITY;

-- Policies for coach_conversations
CREATE POLICY "Users can manage their own conversations"
  ON public.coach_conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for coach_messages
CREATE POLICY "Users can manage messages in their conversations"
  ON public.coach_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.coach_conversations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.coach_conversations WHERE user_id = auth.uid()
    )
  );

-- Policies for coach_usage
CREATE POLICY "Users can view and record their own usage"
  ON public.coach_usage
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_updated
  ON public.coach_conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation_created
  ON public.coach_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_coach_usage_user_created
  ON public.coach_usage(user_id, created_at DESC);
