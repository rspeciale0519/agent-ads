ALTER TABLE public.connection_requests ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'inventory';
