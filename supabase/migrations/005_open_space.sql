-- ============================================================
-- Le Cockpit — Open space : pôles, projets clients, prestataires,
-- demandes, journal d'activité et jetons MCP
-- Les pôles réutilisent la table `projects` (Ulycom, Yoovi, E-commerce…).
-- ============================================================

-- ── Profils : rôle et avatar ─────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role    TEXT DEFAULT 'owner' CHECK (role IN ('owner','prestataire'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills  TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar  JSONB DEFAULT '{}'::jsonb;   -- couleur, tenue… pour l'open space

-- ── Pôles : position dans l'open space ───────────────────────

ALTER TABLE projects ADD COLUMN IF NOT EXISTS office_zone JSONB DEFAULT '{}'::jsonb; -- { x, z, w, d }

-- ── Projets clients ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pole_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  status       TEXT CHECK (status IN ('brief','en_cours','en_revue','livre','en_pause')) DEFAULT 'brief',
  progress     INT  DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  budget       NUMERIC(10,2),
  start_date   DATE,
  due_date     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id       UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ── Membres d'un projet client (prestataires) ────────────────

CREATE TABLE IF NOT EXISTS project_members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_project_id  UUID REFERENCES client_projects(id) ON DELETE CASCADE NOT NULL,
  member_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role               TEXT CHECK (role IN ('prestataire','collaborateur')) DEFAULT 'prestataire',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_project_id, member_id)
);

-- ── Demandes (à un prestataire) et leurs messages ────────────

CREATE TABLE IF NOT EXISTS requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,  -- émetteur (owner)
  pole_id            UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_project_id  UUID REFERENCES client_projects(id) ON DELETE SET NULL,
  recipient_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_email    TEXT,                                 -- si le prestataire n'a pas encore de compte
  title              TEXT NOT NULL,
  body               TEXT,
  status             TEXT CHECK (status IN ('brouillon','envoyee','vue','acceptee','en_cours','livree','refusee','close')) DEFAULT 'envoyee',
  budget             NUMERIC(10,2),
  due_date           DATE,
  created_via        TEXT DEFAULT 'app',                   -- 'app' ou 'mcp:<libellé du jeton>'
  seen_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  author_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_label  TEXT,                                      -- ex: 'Claude' quand l'auteur est un agent
  body          TEXT NOT NULL,
  attachments   JSONB DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Journal d'activité (humains + agents IA) ─────────────────

CREATE TABLE IF NOT EXISTS activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,  -- propriétaire de l'espace
  actor_label  TEXT NOT NULL,                              -- 'Marwann', 'Claude', 'Codex'…
  source       TEXT CHECK (source IN ('app','mcp')) DEFAULT 'app',
  action       TEXT NOT NULL,                              -- ex: 'creer_tache'
  entity_type  TEXT,
  entity_id    UUID,
  summary      TEXT,
  payload      JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Jetons MCP (seul le hash SHA-256 est stocké) ─────────────

CREATE TABLE IF NOT EXISTS mcp_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  label         TEXT NOT NULL,                             -- 'Claude', 'Codex'…
  token_hash    TEXT NOT NULL UNIQUE,
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Index ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_client_projects_user   ON client_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_client ON client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_project   ON tasks(client_project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_member ON project_members(member_id);
CREATE INDEX IF NOT EXISTS idx_requests_user          ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_recipient     ON requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_request_messages_req   ON request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user      ON activity_log(user_id, created_at DESC);

-- ── Fonctions d'accès (SECURITY DEFINER pour éviter la récursion RLS) ──

CREATE OR REPLACE FUNCTION public.is_project_member(cp_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE client_project_id = cp_id AND member_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.owns_client_project(cp_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_projects WHERE id = cp_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Deux profils se voient s'ils partagent un projet client ou une demande.
CREATE OR REPLACE FUNCTION public.shares_workspace(other UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members pm JOIN client_projects cp ON cp.id = pm.client_project_id
    WHERE (cp.user_id = auth.uid() AND pm.member_id = other)
       OR (cp.user_id = other AND pm.member_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM requests r
    WHERE (r.user_id = auth.uid() AND r.recipient_id = other)
       OR (r.user_id = other AND r.recipient_id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_access_request(req_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM requests
    WHERE id = req_id AND (user_id = auth.uid() OR recipient_id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE client_projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tokens       ENABLE ROW LEVEL SECURITY;

-- client_projects : le propriétaire gère, les membres lisent
DROP POLICY IF EXISTS "client_projects: owner all" ON client_projects;
CREATE POLICY "client_projects: owner all"   ON client_projects FOR ALL    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "client_projects: member read" ON client_projects;
CREATE POLICY "client_projects: member read" ON client_projects FOR SELECT USING (public.is_project_member(id));

-- project_members : le propriétaire du projet gère, le membre voit ses lignes
DROP POLICY IF EXISTS "project_members: owner all" ON project_members;
CREATE POLICY "project_members: owner all" ON project_members FOR ALL    USING (public.owns_client_project(client_project_id)) WITH CHECK (public.owns_client_project(client_project_id));
DROP POLICY IF EXISTS "project_members: self read" ON project_members;
CREATE POLICY "project_members: self read" ON project_members FOR SELECT USING (auth.uid() = member_id);

-- tasks : un membre lit et met à jour les tâches de ses projets clients
DROP POLICY IF EXISTS "tasks: member read" ON tasks;
CREATE POLICY "tasks: member read"   ON tasks FOR SELECT USING (client_project_id IS NOT NULL AND public.is_project_member(client_project_id));
DROP POLICY IF EXISTS "tasks: member update" ON tasks;
CREATE POLICY "tasks: member update" ON tasks FOR UPDATE USING (client_project_id IS NOT NULL AND public.is_project_member(client_project_id));

-- clients / pôles : un membre voit le client et le pôle de ses projets
DROP POLICY IF EXISTS "clients: member read" ON clients;
CREATE POLICY "clients: member read" ON clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM client_projects cp WHERE cp.client_id = clients.id AND public.is_project_member(cp.id))
);
DROP POLICY IF EXISTS "projects: member read" ON projects;
CREATE POLICY "projects: member read" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM client_projects cp WHERE cp.pole_id = projects.id AND public.is_project_member(cp.id))
);

-- profiles : visibles entre personnes qui travaillent ensemble
DROP POLICY IF EXISTS "profiles: shared read" ON profiles;
CREATE POLICY "profiles: shared read" ON profiles FOR SELECT USING (public.shares_workspace(id));

-- requests : l'émetteur gère, le destinataire lit et met à jour le statut
DROP POLICY IF EXISTS "requests: owner all" ON requests;
CREATE POLICY "requests: owner all"        ON requests FOR ALL    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "requests: recipient read" ON requests;
CREATE POLICY "requests: recipient read"   ON requests FOR SELECT USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "requests: recipient update" ON requests;
CREATE POLICY "requests: recipient update" ON requests FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- request_messages : les deux parties lisent et écrivent
DROP POLICY IF EXISTS "request_messages: read" ON request_messages;
CREATE POLICY "request_messages: read"   ON request_messages FOR SELECT USING (public.can_access_request(request_id));
DROP POLICY IF EXISTS "request_messages: insert" ON request_messages;
CREATE POLICY "request_messages: insert" ON request_messages FOR INSERT WITH CHECK (public.can_access_request(request_id) AND auth.uid() = author_id);

-- activity_log : lecture seule côté app pour le propriétaire (écrit par l'app ou le serveur MCP)
DROP POLICY IF EXISTS "activity_log: owner read" ON activity_log;
CREATE POLICY "activity_log: owner read"   ON activity_log FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "activity_log: owner insert" ON activity_log;
CREATE POLICY "activity_log: owner insert" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- mcp_tokens : le propriétaire liste, crée et révoque ses jetons
DROP POLICY IF EXISTS "mcp_tokens: owner all" ON mcp_tokens;
CREATE POLICY "mcp_tokens: owner all" ON mcp_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── updated_at automatique ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_projects_updated ON client_projects;
CREATE TRIGGER trg_client_projects_updated BEFORE UPDATE ON client_projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_requests_updated ON requests;
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Temps réel pour l'open space ─────────────────────────────

-- Ré-exécutable : n'ajoute que les tables pas encore publiées.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['client_projects','tasks','requests','request_messages','activity_log'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
