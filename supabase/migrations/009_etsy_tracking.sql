-- Suivi quotidien Etsy : relevés datés des compteurs publics (boutiques et fiches suivies).
-- Écrit uniquement par le serveur (service role) : cron quotidien + ajout d'une boutique. Conservation 90 jours.
CREATE TABLE IF NOT EXISTS etsy_snapshots (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('shop', 'listing')),
  entity_id  BIGINT NOT NULL,
  shop_id    BIGINT,
  day        DATE NOT NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vals       JSONB NOT NULL,
  PRIMARY KEY (user_id, kind, entity_id, day)
);
CREATE INDEX IF NOT EXISTS idx_etsy_snapshots_user_day ON etsy_snapshots(user_id, day);

ALTER TABLE etsy_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "etsy_snapshots: select own" ON etsy_snapshots;
CREATE POLICY "etsy_snapshots: select own" ON etsy_snapshots FOR SELECT USING (auth.uid() = user_id);
