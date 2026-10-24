-- ============================================================
-- Le Cockpit — WhatsApp Business (API Cloud officielle de Meta)
-- Messages reçus via le webhook /api/whatsapp/webhook et envoyés via /api/whatsapp/send
-- (ou par Claude / Codex via le MCP). Écrits uniquement côté serveur (clé service role).
-- Ré-exécutable sans risque.
-- ============================================================

CREATE TABLE IF NOT EXISTS wa_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wa_message_id   TEXT UNIQUE,                         -- identifiant Meta (wamid…)
  contact_phone   TEXT NOT NULL,                       -- format international sans « + » (ex. 33612345678)
  contact_name    TEXT,
  direction       TEXT NOT NULL CHECK (direction IN ('in','out')),
  type            TEXT NOT NULL DEFAULT 'text',        -- text, image, audio, document, template…
  body            TEXT,
  status          TEXT,                                -- sortants : sent, delivered, read, failed
  error           TEXT,
  sent_via        TEXT DEFAULT 'app',                  -- 'app' ou 'mcp:<agent>'
  read_at         TIMESTAMPTZ,                         -- entrants : lu dans le Cockpit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_conv ON wa_messages(user_id, contact_phone, created_at DESC);

ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_messages: select own" ON wa_messages;
CREATE POLICY "wa_messages: select own" ON wa_messages FOR SELECT USING (auth.uid() = user_id);
-- Le Cockpit marque les messages comme lus ; l'écriture du contenu reste réservée au serveur.
DROP POLICY IF EXISTS "wa_messages: mark read own" ON wa_messages;
CREATE POLICY "wa_messages: mark read own" ON wa_messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wa_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages;
  END IF;
END $$;
