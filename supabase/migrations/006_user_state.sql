-- ============================================================
-- Le Cockpit — Synchronisation de l'état de l'app
-- Un document JSON par utilisateur : c'est exactement l'état du store local
-- (tâches, projets, clients, sessions…), synchronisé entre appareils en temps réel.
-- Ré-exécutable sans risque.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_state (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state       JSONB NOT NULL,
  client_id   TEXT,                       -- onglet qui a écrit en dernier (évite l'écho temps réel)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_state: select own" ON user_state;
CREATE POLICY "user_state: select own" ON user_state FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_state: insert own" ON user_state;
CREATE POLICY "user_state: insert own" ON user_state FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_state: update own" ON user_state;
CREATE POLICY "user_state: update own" ON user_state FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_state') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_state;
  END IF;
END $$;
