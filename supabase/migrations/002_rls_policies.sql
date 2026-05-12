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

CREATE POLICY "profiles: select own"  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: insert own"  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles: update own"  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles: delete own"  ON profiles FOR DELETE USING (auth.uid() = id);

-- ── projects ─────────────────────────────────────────────────

CREATE POLICY "projects: select own"  ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects: insert own"  ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects: update own"  ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects: delete own"  ON projects FOR DELETE USING (auth.uid() = user_id);

-- ── clients ──────────────────────────────────────────────────

CREATE POLICY "clients: select own"   ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients: insert own"   ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients: update own"   ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients: delete own"   ON clients FOR DELETE USING (auth.uid() = user_id);

-- ── tasks ────────────────────────────────────────────────────

CREATE POLICY "tasks: select own"     ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks: insert own"     ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks: update own"     ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tasks: delete own"     ON tasks FOR DELETE USING (auth.uid() = user_id);

-- ── sessions ─────────────────────────────────────────────────

CREATE POLICY "sessions: select own"  ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions: insert own"  ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions: update own"  ON sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions: delete own"  ON sessions FOR DELETE USING (auth.uid() = user_id);

-- ── notes ────────────────────────────────────────────────────

CREATE POLICY "notes: select own"     ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes: insert own"     ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes: update own"     ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes: delete own"     ON notes FOR DELETE USING (auth.uid() = user_id);

-- ── invoices ─────────────────────────────────────────────────

CREATE POLICY "invoices: select own"  ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "invoices: insert own"  ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices: update own"  ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "invoices: delete own"  ON invoices FOR DELETE USING (auth.uid() = user_id);

-- ── inbox_items ──────────────────────────────────────────────

CREATE POLICY "inbox: select own"     ON inbox_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inbox: insert own"     ON inbox_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inbox: update own"     ON inbox_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "inbox: delete own"     ON inbox_items FOR DELETE USING (auth.uid() = user_id);

-- ── resources ────────────────────────────────────────────────

CREATE POLICY "resources: select own" ON resources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "resources: insert own" ON resources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "resources: update own" ON resources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "resources: delete own" ON resources FOR DELETE USING (auth.uid() = user_id);

-- ── client_documents ─────────────────────────────────────────

CREATE POLICY "docs: select own"      ON client_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "docs: insert own"      ON client_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "docs: update own"      ON client_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "docs: delete own"      ON client_documents FOR DELETE USING (auth.uid() = user_id);

-- ── trainings ────────────────────────────────────────────────

CREATE POLICY "trainings: select own" ON trainings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trainings: insert own" ON trainings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trainings: update own" ON trainings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trainings: delete own" ON trainings FOR DELETE USING (auth.uid() = user_id);

-- ── calendar_events ──────────────────────────────────────────

CREATE POLICY "cal: select own"       ON calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cal: insert own"       ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cal: update own"       ON calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cal: delete own"       ON calendar_events FOR DELETE USING (auth.uid() = user_id);

-- ── appointments ─────────────────────────────────────────────

CREATE POLICY "appts: select own"     ON appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "appts: insert own"     ON appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appts: update own"     ON appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "appts: delete own"     ON appointments FOR DELETE USING (auth.uid() = user_id);

-- ── energy_logs ──────────────────────────────────────────────

CREATE POLICY "energy: select own"    ON energy_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "energy: insert own"    ON energy_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "energy: update own"    ON energy_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "energy: delete own"    ON energy_logs FOR DELETE USING (auth.uid() = user_id);

-- ── user_settings ────────────────────────────────────────────

CREATE POLICY "settings: select own"  ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings: insert own"  ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings: update own"  ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "settings: delete own"  ON user_settings FOR DELETE USING (auth.uid() = user_id);
