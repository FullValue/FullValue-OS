-- ============================================================
-- Le Cockpit — Studio Créatif : stockage des fichiers (créas concurrentes, assets, rendus)
-- Les métadonnées vivent dans user_state (collections creatives, creativeAssets, montages).
-- Chaque utilisateur range ses fichiers dans son dossier : creative-files/<user_id>/…
-- Ré-exécutable sans risque.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('creative-files', 'creative-files', false, 524288000) -- 500 Mo par fichier
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "creative-files: upload own" ON storage.objects;
CREATE POLICY "creative-files: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'creative-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "creative-files: read own" ON storage.objects;
CREATE POLICY "creative-files: read own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creative-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "creative-files: delete own" ON storage.objects;
CREATE POLICY "creative-files: delete own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'creative-files' AND auth.uid()::text = (storage.foldername(name))[1]);
