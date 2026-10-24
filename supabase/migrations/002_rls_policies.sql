-- ============================================================
-- Le Cockpit — RLS Policies
-- Chaque utilisateur ne voit et ne modifie que ses propres données
-- ============================================================

-- ── Activer RLS sur toutes les tables ────────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources         ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings     ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles: select own" ON profiles;
CREATE POLICY "profiles: select own"  ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles: insert own" ON profiles;
CREATE POLICY "profiles: insert own"  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles: update own" ON profiles;
CREATE POLICY "profiles: update own"  ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles: delete own" ON profiles;
CREATE POLICY "profiles: delete own"  ON profiles FOR DELETE USING (auth.uid() = id);

-- ── projects ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "projects: select own" ON projects;
CREATE POLICY "projects: select own"  ON projects FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "projects: insert own" ON projects;
CREATE POLICY "projects: insert own"  ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "projects: update own" ON projects;
CREATE POLICY "projects: update own"  ON projects FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "projects: delete own" ON projects;
CREATE POLICY "projects: delete own"  ON projects FOR DELETE USING (auth.uid() = user_id);

-- ── clients ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "clients: select own" ON clients;
CREATE POLICY "clients: select own"   ON clients FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "clients: insert own" ON clients;
CREATE POLICY "clients: insert own"   ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "clients: update own" ON clients;
CREATE POLICY "clients: update own"   ON clients FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "clients: delete own" ON clients;
CREATE POLICY "clients: delete own"   ON clients FOR DELETE USING (auth.uid() = user_id);

-- ── tasks ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "tasks: select own" ON tasks;
CREATE POLICY "tasks: select own"     ON tasks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tasks: insert own" ON tasks;
CREATE POLICY "tasks: insert own"     ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tasks: update own" ON tasks;
CREATE POLICY "tasks: update own"     ON tasks FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tasks: delete own" ON tasks;
CREATE POLICY "tasks: delete own"     ON tasks FOR DELETE USING (auth.uid() = user_id);

-- ── sessions ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "sessions: select own" ON sessions;
CREATE POLICY "sessions: select own"  ON sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sessions: insert own" ON sessions;
CREATE POLICY "sessions: insert own"  ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "sessions: update own" ON sessions;
CREATE POLICY "sessions: update own"  ON sessions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sessions: delete own" ON sessions;
CREATE POLICY "sessions: delete own"  ON sessions FOR DELETE USING (auth.uid() = user_id);

-- ── notes ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notes: select own" ON notes;
CREATE POLICY "notes: select own"     ON notes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notes: insert own" ON notes;
CREATE POLICY "notes: insert own"     ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notes: update own" ON notes;
CREATE POLICY "notes: update own"     ON notes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notes: delete own" ON notes;
CREATE POLICY "notes: delete own"     ON notes FOR DELETE USING (auth.uid() = user_id);

-- ── invoices ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "invoices: select own" ON invoices;
CREATE POLICY "invoices: select own"  ON invoices FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "invoices: insert own" ON invoices;
CREATE POLICY "invoices: insert own"  ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "invoices: update own" ON invoices;
CREATE POLICY "invoices: update own"  ON invoices FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "invoices: delete own" ON invoices;
CREATE POLICY "invoices: delete own"  ON invoices FOR DELETE USING (auth.uid() = user_id);

-- ── inbox_items ──────────────────────────────────────────────

DROP POLICY IF EXISTS "inbox: select own" ON inbox_items;
CREATE POLICY "inbox: select own"     ON inbox_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "inbox: insert own" ON inbox_items;
CREATE POLICY "inbox: insert own"     ON inbox_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "inbox: update own" ON inbox_items;
CREATE POLICY "inbox: update own"     ON inbox_items FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "inbox: delete own" ON inbox_items;
CREATE POLICY "inbox: delete own"     ON inbox_items FOR DELETE USING (auth.uid() = user_id);

-- ── resources ────────────────────────────────────────────────

DROP POLICY IF EXISTS "resources: select own" ON resources;
CREATE POLICY "resources: select own" ON resources FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "resources: insert own" ON resources;
CREATE POLICY "resources: insert own" ON resources FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "resources: update own" ON resources;
CREATE POLICY "resources: update own" ON resources FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "resources: delete own" ON resources;
CREATE POLICY "resources: delete own" ON resources FOR DELETE USING (auth.uid() = user_id);

-- ── client_documents ─────────────────────────────────────────

DROP POLICY IF EXISTS "docs: select own" ON client_documents;
CREATE POLICY "docs: select own"      ON client_documents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "docs: insert own" ON client_documents;
CREATE POLICY "docs: insert own"      ON client_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "docs: update own" ON client_documents;
CREATE POLICY "docs: update own"      ON client_documents FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "docs: delete own" ON client_documents;
CREATE POLICY "docs: delete own"      ON client_documents FOR DELETE USING (auth.uid() = user_id);

-- ── trainings ────────────────────────────────────────────────

DROP POLICY IF EXISTS "trainings: select own" ON trainings;
CREATE POLICY "trainings: select own" ON trainings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "trainings: insert own" ON trainings;
CREATE POLICY "trainings: insert own" ON trainings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "trainings: update own" ON trainings;
CREATE POLICY "trainings: update own" ON trainings FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "trainings: delete own" ON trainings;
CREATE POLICY "trainings: delete own" ON trainings FOR DELETE USING (auth.uid() = user_id);

-- ── calendar_events ──────────────────────────────────────────

DROP POLICY IF EXISTS "cal: select own" ON calendar_events;
CREATE POLICY "cal: select own"       ON calendar_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cal: insert own" ON calendar_events;
CREATE POLICY "cal: insert own"       ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cal: update own" ON calendar_events;
CREATE POLICY "cal: update own"       ON calendar_events FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cal: delete own" ON calendar_events;
CREATE POLICY "cal: delete own"       ON calendar_events FOR DELETE USING (auth.uid() = user_id);

-- ── appointments ─────────────────────────────────────────────

DROP POLICY IF EXISTS "appts: select own" ON appointments;
CREATE POLICY "appts: select own"     ON appointments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "appts: insert own" ON appointments;
CREATE POLICY "appts: insert own"     ON appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "appts: update own" ON appointments;
CREATE POLICY "appts: update own"     ON appointments FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "appts: delete own" ON appointments;
CREATE POLICY "appts: delete own"     ON appointments FOR DELETE USING (auth.uid() = user_id);

-- ── energy_logs ──────────────────────────────────────────────

DROP POLICY IF EXISTS "energy: select own" ON energy_logs;
CREATE POLICY "energy: select own"    ON energy_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "energy: insert own" ON energy_logs;
CREATE POLICY "energy: insert own"    ON energy_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "energy: update own" ON energy_logs;
CREATE POLICY "energy: update own"    ON energy_logs FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "energy: delete own" ON energy_logs;
CREATE POLICY "energy: delete own"    ON energy_logs FOR DELETE USING (auth.uid() = user_id);

-- ── user_settings ────────────────────────────────────────────

DROP POLICY IF EXISTS "settings: select own" ON user_settings;
CREATE POLICY "settings: select own"  ON user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings: insert own" ON user_settings;
CREATE POLICY "settings: insert own"  ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings: update own" ON user_settings;
CREATE POLICY "settings: update own"  ON user_settings FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings: delete own" ON user_settings;
CREATE POLICY "settings: delete own"  ON user_settings FOR DELETE USING (auth.uid() = user_id);
