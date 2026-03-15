-- ============================================================================
-- AI Conversations & Messages
-- Persists chat history for the AI chatbot panel.
-- ============================================================================

-- ── ai_conversations ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL DEFAULT 'New conversation',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  created_by  uuid        REFERENCES auth.users(id),
  deleted_at  timestamptz
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations (user_id);
CREATE INDEX idx_ai_conversations_updated_at ON ai_conversations (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Users can only interact with their own conversations
CREATE POLICY ai_conversations_select_own_policy
  ON ai_conversations FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY ai_conversations_insert_own_policy
  ON ai_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_conversations_update_own_policy
  ON ai_conversations FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_conversations_delete_own_policy
  ON ai_conversations FOR DELETE
  USING (user_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER set_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ── ai_messages ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_messages (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid        NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text        NOT NULL,
  citations       jsonb,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  created_by      uuid        REFERENCES auth.users(id),
  deleted_at      timestamptz
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_messages_conversation_id ON ai_messages (conversation_id, created_at ASC);

-- Messages inherit access from their conversation (user_id match)
CREATE POLICY ai_messages_select_own_policy
  ON ai_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY ai_messages_insert_own_policy
  ON ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY ai_messages_update_own_policy
  ON ai_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY ai_messages_delete_own_policy
  ON ai_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE TRIGGER set_ai_messages_updated_at
  BEFORE UPDATE ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
