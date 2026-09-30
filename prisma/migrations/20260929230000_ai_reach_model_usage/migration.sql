BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- Provider usage for an AI Reach answer that called a language model:
-- provider, model, what AI Reach did with the call, and billed tokens.
-- Messages stay append-only, so each record is immutable once saved.
ALTER TABLE "public"."ai_reach_messages" ADD COLUMN "model_usage" JSONB;

ALTER TABLE "public"."ai_reach_messages" ADD CONSTRAINT "ai_reach_messages_model_usage_check"
  CHECK ("model_usage" IS NULL OR ("role" = 'assistant' AND jsonb_typeof("model_usage") = 'object'));

COMMIT;
