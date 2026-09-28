-- Migration: 20260925000000_create_encrypted_reports.sql
-- Description: Phase 2B Step 1 — Create public.encrypted_reports table and strict RLS policies for zero-knowledge encrypted report sync.

-- 1. Create table public.encrypted_reports
CREATE TABLE IF NOT EXISTS public.encrypted_reports (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  PRIMARY KEY (user_id, id)
);

-- 2. Indexes for fast query and sync operations
CREATE INDEX IF NOT EXISTS idx_encrypted_reports_user_updated 
  ON public.encrypted_reports(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_encrypted_reports_user_deleted 
  ON public.encrypted_reports(user_id, deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.encrypted_reports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Authenticated users can only operate on their own rows (auth.uid() = user_id)

-- 4a. SELECT Policy
CREATE POLICY "Users can read own encrypted reports"
  ON public.encrypted_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4b. INSERT Policy
CREATE POLICY "Users can insert own encrypted reports"
  ON public.encrypted_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4c. UPDATE Policy
CREATE POLICY "Users can update own encrypted reports"
  ON public.encrypted_reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4d. DELETE Policy
CREATE POLICY "Users can delete own encrypted reports"
  ON public.encrypted_reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
