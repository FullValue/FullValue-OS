-- ============================================================
-- Le Cockpit — Phase 3C : colonnes YouTube
-- ============================================================

ALTER TABLE trainings
  ADD COLUMN IF NOT EXISTS youtube_id            TEXT,
  ADD COLUMN IF NOT EXISTS youtube_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel       TEXT;

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS youtube_id            TEXT,
  ADD COLUMN IF NOT EXISTS youtube_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel       TEXT;

ALTER TABLE client_documents
  ADD COLUMN IF NOT EXISTS youtube_id            TEXT,
  ADD COLUMN IF NOT EXISTS youtube_thumbnail_url TEXT;

-- ── Étendre les contraintes ──────────────────────────────────

ALTER TABLE trainings DROP CONSTRAINT IF EXISTS trainings_type_check;
ALTER TABLE trainings ADD CONSTRAINT trainings_type_check
  CHECK (type IN ('video','article','book','framework','podcast','link','file','youtube'));

ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_check;
ALTER TABLE resources ADD CONSTRAINT resources_type_check
  CHECK (type IN ('prompt','template','link','file','youtube'));
