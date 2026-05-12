-- ============================================================
-- Le Cockpit — Migration initiale
-- Adapté au schéma réel du localStorage (voir docs/CURRENT_STATE.md)
-- ⚠️ status des tâches : 'inprogress' (sans underscore) pour compat
-- ============================================================

-- ── Profiles (extension de auth.users) ──────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger : créer un profile automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Projets ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  slug                 TEXT NOT NULL,                     -- ex: 'p1', 'p2'
  name                 TEXT NOT NULL,
  tier                 TEXT CHECK (tier IN ('T1','T2','T3','T4')),
  emoji                TEXT,
  north_star           TEXT,
  north_star_progress  INT  DEFAULT 0 CHECK (north_star_progress BETWEEN 0 AND 100),
  accent_color         TEXT,                              -- hex color
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- ── Clients ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  short_name    TEXT,
  city          TEXT,
  activity_type TEXT,
  status        TEXT CHECK (status IN ('prospect','onboarding','active','paused','completed','archived')) DEFAULT 'onboarding',
  start_date    DATE,
  accent_color  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tâches ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  description         TEXT,                              -- ← anciennement 'notes'
  status              TEXT CHECK (status IN ('todo','inprogress','done')) DEFAULT 'todo',
  impact              TEXT CHECK (impact IN ('high','low')),
  ship_at_80          BOOLEAN DEFAULT FALSE,             -- ← anciennement 'ship80'
  ship_at_80_delivered BOOLEAN DEFAULT FALSE,            -- ← anciennement 'ship80Delivered'
  is_priority_today   BOOLEAN DEFAULT FALSE,             -- ← anciennement 'today'
  start_date          DATE,
  due_date            DATE,
  estimated_minutes   INT,
  order_index         INT,
  cover_url           TEXT,
  tags                TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

-- ── Sessions chronométrées ───────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  task_id          UUID REFERENCES tasks(id) ON DELETE SET NULL,
  duration_seconds INT  NOT NULL,                        -- ← anciennement 'duration'
  log_message      TEXT,                                 -- ← anciennement 'note'
  started_at       TIMESTAMPTZ NOT NULL,                 -- ← anciennement 'date'
  ended_at         TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notes (projets et clients) ───────────────────────────────

CREATE TABLE IF NOT EXISTS notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Note sans titre',
  content     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Factures ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_ht      NUMERIC(10,2),
  vat_rate       NUMERIC(5,2) DEFAULT 20,
  amount_ttc     NUMERIC(10,2),
  description    TEXT,
  status         TEXT CHECK (status IN ('to_emit','sent','paid','overdue')) DEFAULT 'to_emit',
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Inbox ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inbox_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content               TEXT NOT NULL,                   -- ← anciennement 'text'
  type                  TEXT CHECK (type IN ('task','idea','note')) DEFAULT 'task',
  captured_at           TIMESTAMPTZ DEFAULT NOW(),        -- ← anciennement 'createdAt'
  processed             BOOLEAN DEFAULT FALSE,
  converted_to_task_id  UUID REFERENCES tasks(id) ON DELETE SET NULL
);

-- ── Ressources (Hub Ressources) ──────────────────────────────

CREATE TABLE IF NOT EXISTS resources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,                             -- ← anciennement 'title'
  type        TEXT CHECK (type IN ('prompt','template','link')),
  category    TEXT,                                      -- ← fusionne 'tag' + 'category'
  description TEXT,
  content     TEXT,
  url         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Documents clients ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT,
  description TEXT,
  url         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Formations ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trainings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  type        TEXT CHECK (type IN ('video','article','book','framework','podcast','link')),
  author      TEXT,
  category    TEXT,
  status      TEXT CHECK (status IN ('to_watch','in_progress','done')) DEFAULT 'to_watch',
  url         TEXT,
  notes       TEXT,
  takeaways   JSONB DEFAULT '[]'::jsonb,
  citations   JSONB DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Événements calendrier ────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  date        DATE,
  start_time  TEXT,                                      -- 'HH:MM'
  end_time    TEXT,
  accent_color TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Rendez-vous ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  starts_at        TIMESTAMPTZ NOT NULL,
  duration_minutes INT,
  location         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Énergie quotidienne ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS energy_logs (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date     DATE NOT NULL DEFAULT CURRENT_DATE,
  level    INT  CHECK (level BETWEEN 1 AND 5),
  UNIQUE(user_id, date)
);

-- ── Paramètres utilisateur ───────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  end_of_workday  TEXT DEFAULT '20:00',   -- 'HH:MM'
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
