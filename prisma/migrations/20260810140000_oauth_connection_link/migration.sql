ALTER TABLE public.oauth_transactions ADD COLUMN IF NOT EXISTS connection_id uuid;
CREATE INDEX IF NOT EXISTS oauth_transactions_connection_id_status_idx ON public.oauth_transactions(connection_id, status);
