BEGIN;

-- Saved "Ask AI" conversations about performance evaluation submissions
-- (5% reflections first). Answers quote named, sensitive reflection content,
-- so every row is visible only to its owner while they remain a performance admin.

CREATE TABLE public.performance_insight_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  evaluation_kind text NOT NULL CHECK (
    evaluation_kind IN ('monthly', 'quarterly', 'five_percent', 'monthly_call_feedback')
  ),
  period_key text NOT NULL CHECK (
    period_key ~ '^\d{4}-\d{2}$' OR period_key ~ '^\d{4}-Q[1-4]$'
  ),
  months_back smallint NOT NULL DEFAULT 3 CHECK (months_back BETWEEN 0 AND 6),
  title text NOT NULL DEFAULT 'New conversation' CHECK (char_length(title) BETWEEN 1 AND 120),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX idx_performance_insight_conversations_user_recent
  ON public.performance_insight_conversations(user_id, evaluation_kind, last_message_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE public.performance_insight_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.performance_insight_conversations(id) ON DELETE CASCADE,
  -- Denormalized from the conversation for RLS and per-user rate limiting.
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) <= 20000),
  status text NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'error', 'aborted')),
  context_snapshot_hash text,
  context_meta jsonb,
  model text,
  input_tokens integer CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens integer CHECK (output_tokens IS NULL OR output_tokens >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX idx_performance_insight_messages_conversation
  ON public.performance_insight_messages(conversation_id, created_at);

CREATE INDEX idx_performance_insight_messages_user_questions
  ON public.performance_insight_messages(user_id, created_at DESC)
  WHERE role = 'user';

ALTER TABLE public.performance_insight_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_insight_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.performance_insight_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_insight_messages FORCE ROW LEVEL SECURITY;

-- Owner AND still a performance admin: revoking the role revokes access immediately.
-- deleted_at is filtered in queries rather than in SELECT policies so that
-- soft-delete updates remain visible to the UPDATE ... RETURNING check.
CREATE POLICY performance_insight_conversations_select_policy
  ON public.performance_insight_conversations
  FOR SELECT
  TO authenticated
  USING (
    performance_insight_conversations.user_id = auth.uid()
    AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY performance_insight_conversations_insert_policy
  ON public.performance_insight_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    performance_insight_conversations.user_id = auth.uid()
    AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

CREATE POLICY performance_insight_conversations_update_policy
  ON public.performance_insight_conversations
  FOR UPDATE
  TO authenticated
  USING (
    performance_insight_conversations.user_id = auth.uid()
    AND performance_insight_conversations.deleted_at IS NULL
    AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  )
  WITH CHECK (
    performance_insight_conversations.user_id = auth.uid()
    AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

-- No DELETE policy: conversations are soft-deleted.

-- Messages are append-only (no UPDATE or DELETE policies).
CREATE POLICY performance_insight_messages_select_policy
  ON public.performance_insight_messages
  FOR SELECT
  TO authenticated
  USING (
    performance_insight_messages.user_id = auth.uid()
    AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
    AND EXISTS (
      SELECT 1
      FROM public.performance_insight_conversations conversation
      WHERE conversation.id = performance_insight_messages.conversation_id
        AND conversation.user_id = auth.uid()
        AND conversation.deleted_at IS NULL
    )
  );

CREATE POLICY performance_insight_messages_insert_policy
  ON public.performance_insight_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    performance_insight_messages.user_id = auth.uid()
    AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
    AND EXISTS (
      SELECT 1
      FROM public.performance_insight_conversations conversation
      WHERE conversation.id = performance_insight_messages.conversation_id
        AND conversation.user_id = auth.uid()
        AND conversation.deleted_at IS NULL
    )
  );

CREATE TRIGGER set_performance_insight_conversations_updated_at
  BEFORE UPDATE ON public.performance_insight_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.performance_insight_conversations IS
  'Saved Ask AI conversations about performance evaluation submissions; owner-only while a performance admin.';
COMMENT ON TABLE public.performance_insight_messages IS
  'Append-only questions and AI answers for performance insight conversations. Content may quote named reflections.';

COMMIT;
