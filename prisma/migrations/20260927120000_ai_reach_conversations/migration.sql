BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- Saved AI Reach chat. A conversation belongs to one user in one organization.
-- Rows are append-only for the runtime, and each user sees only their own.
CREATE TABLE "public"."ai_reach_conversations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reach_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ai_reach_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "answer_kind" TEXT,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reach_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_reach_messages_role_check" CHECK ("role" IN ('user', 'assistant')),
    CONSTRAINT "ai_reach_messages_content_check" CHECK (char_length("content") BETWEEN 1 AND 4000),
    CONSTRAINT "ai_reach_messages_answer_kind_check"
      CHECK (("role" = 'user' AND "answer_kind" IS NULL) OR ("role" = 'assistant' AND "answer_kind" IN ('boundary', 'evidence', 'abstain', 'guidance'))),
    CONSTRAINT "ai_reach_messages_citations_check" CHECK (jsonb_typeof("citations") = 'array')
);

CREATE INDEX "ai_reach_conversations_organization_id_user_id_created_at_idx" ON "public"."ai_reach_conversations"("organization_id", "user_id", "created_at");

CREATE UNIQUE INDEX "ai_reach_conversations_organization_id_id_key" ON "public"."ai_reach_conversations"("organization_id", "id");

CREATE INDEX "ai_reach_messages_organization_id_conversation_id_created_a_idx" ON "public"."ai_reach_messages"("organization_id", "conversation_id", "created_at");

ALTER TABLE "public"."ai_reach_conversations" ADD CONSTRAINT "ai_reach_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The composite key keeps a message in the same organization as its conversation.
ALTER TABLE "public"."ai_reach_messages" ADD CONSTRAINT "ai_reach_messages_organization_id_conversation_id_fkey" FOREIGN KEY ("organization_id", "conversation_id") REFERENCES "public"."ai_reach_conversations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE public.ai_reach_conversations, public.ai_reach_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_reach_conversations, public.ai_reach_messages TO app_runtime;

ALTER TABLE public.ai_reach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reach_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reach_messages FORCE ROW LEVEL SECURITY;

-- A conversation is visible only to the user who started it, in its organization.
CREATE POLICY ai_reach_conversations_select ON public.ai_reach_conversations
  FOR SELECT TO app_runtime
  USING (organization_id = private.current_organization_id() AND user_id = private.current_actor_id());
CREATE POLICY ai_reach_conversations_insert ON public.ai_reach_conversations
  FOR INSERT TO app_runtime
  WITH CHECK (organization_id = private.current_organization_id() AND user_id = private.current_actor_id());

-- A message is visible or writable only through a conversation the user owns.
CREATE POLICY ai_reach_messages_select ON public.ai_reach_messages
  FOR SELECT TO app_runtime
  USING (
    organization_id = private.current_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.ai_reach_conversations AS conversation
      WHERE conversation.organization_id = ai_reach_messages.organization_id
        AND conversation.id = ai_reach_messages.conversation_id
        AND conversation.user_id = private.current_actor_id()
    )
  );
CREATE POLICY ai_reach_messages_insert ON public.ai_reach_messages
  FOR INSERT TO app_runtime
  WITH CHECK (
    organization_id = private.current_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.ai_reach_conversations AS conversation
      WHERE conversation.organization_id = ai_reach_messages.organization_id
        AND conversation.id = ai_reach_messages.conversation_id
        AND conversation.user_id = private.current_actor_id()
    )
  );

COMMIT;
