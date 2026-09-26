BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- Read-only AI Reach evidence snapshots. Rows are append-only for the runtime:
-- a correction is a new snapshot, so a briefing can always cite what it saw.
CREATE TABLE "public"."ai_reach_evidence_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "snapshot_key" TEXT NOT NULL,
    "primary_outcome_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reporting_window_start" TIMESTAMPTZ(6) NOT NULL,
    "reporting_window_end" TIMESTAMPTZ(6) NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "collector_version" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reach_evidence_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_reach_evidence_snapshots_primary_outcome_check"
      CHECK ("primary_outcome_key" IN ('qualified_leads', 'booked_calls', 'closed_won_deals', 'booked_revenue')),
    CONSTRAINT "ai_reach_evidence_snapshots_status_check"
      CHECK ("status" IN ('complete', 'partial', 'blocked')),
    CONSTRAINT "ai_reach_evidence_snapshots_window_check"
      CHECK ("reporting_window_end" > "reporting_window_start" AND "captured_at" >= "reporting_window_end"),
    -- The stored document must describe this row's tenant and key.
    CONSTRAINT "ai_reach_evidence_snapshots_document_check"
      CHECK (
        jsonb_typeof("snapshot") = 'object'
        AND "snapshot"->>'organizationId' = "organization_id"::text
        AND "snapshot"->>'snapshotId' = "snapshot_key"
      )
);

CREATE INDEX "ai_reach_evidence_snapshots_organization_id_captured_at_idx" ON "public"."ai_reach_evidence_snapshots"("organization_id", "captured_at");

CREATE UNIQUE INDEX "ai_reach_evidence_snapshots_organization_id_snapshot_key_key" ON "public"."ai_reach_evidence_snapshots"("organization_id", "snapshot_key");

ALTER TABLE "public"."ai_reach_evidence_snapshots" ADD CONSTRAINT "ai_reach_evidence_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE public.ai_reach_evidence_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_reach_evidence_snapshots TO app_runtime;

ALTER TABLE public.ai_reach_evidence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reach_evidence_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_reach_evidence_snapshots_select ON public.ai_reach_evidence_snapshots
  FOR SELECT TO app_runtime USING (organization_id = private.current_organization_id());
CREATE POLICY ai_reach_evidence_snapshots_insert ON public.ai_reach_evidence_snapshots
  FOR INSERT TO app_runtime WITH CHECK (organization_id = private.current_organization_id());

COMMIT;
