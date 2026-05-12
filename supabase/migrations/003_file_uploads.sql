-- ============================================================
-- Le Cockpit — Phase 3B : colonnes fichiers + storage policies
-- ============================================================

-- ── Colonnes fichiers sur les 3 tables ──────────────────────

ALTER TABLE trainings
  ADD COLUMN IF NOT EXISTS file_path       TEXT,
  ADD COLUMN IF NOT EXISTS file_name       TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes INT,
  ADD COLUMN IF NOT EXISTS file_mime_type  TEXT;

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS file_path       TEXT,
  ADD COLUMN IF NOT EXISTS file_name       TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes INT,
  ADD COLUMN IF NOT EXISTS file_mime_type  TEXT;

ALTER TABLE client_documents
  ADD COLUMN IF NOT EXISTS file_path       TEXT,
  ADD COLUMN IF NOT EXISTS file_name       TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes INT,
  ADD COLUMN IF NOT EXISTS file_mime_type  TEXT;

-- ── Étendre les contraintes de type ─────────────────────────

ALTER TABLE trainings DROP CONSTRAINT IF EXISTS trainings_type_check;
ALTER TABLE trainings ADD CONSTRAINT trainings_type_check
  CHECK (type IN ('video','article','book','framework','podcast','link','file'));

ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_check;
ALTER TABLE resources ADD CONSTRAINT resources_type_check
  CHECK (type IN ('prompt','template','link','file'));

-- ── Storage RLS policies ─────────────────────────────────────
-- À exécuter APRÈS avoir créé les 3 buckets dans le dashboard Supabase :
--   training-files | resource-files | client-documents
--   Public: NON | File size limit: 50MB

-- training-files
CREATE POLICY "training-files: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'training-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "training-files: read own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'training-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "training-files: delete own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'training-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- resource-files
CREATE POLICY "resource-files: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resource-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "resource-files: read own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resource-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "resource-files: delete own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'resource-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- client-documents
CREATE POLICY "client-documents: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "client-documents: read own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "client-documents: delete own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
