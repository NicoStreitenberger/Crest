-- ============================================================
-- CREST STUDIO — FULL RESET + REBUILD SCRIPT
-- Version: MASTER (consolida migraciones 001 → 007)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ADVERTENCIA: Borra y recrea TODAS las tablas desde cero.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 1: LIMPIEZA TOTAL (DROP de todo en orden inverso)
-- ────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.analytics_events      CASCADE;
DROP TABLE IF EXISTS public.enlist_applications   CASCADE;
DROP TABLE IF EXISTS public.articles              CASCADE;
DROP TABLE IF EXISTS public.projects              CASCADE;

-- Tablas del esquema antiguo (001/002), por si existen
DROP TABLE IF EXISTS public.leads                 CASCADE;
DROP TABLE IF EXISTS public.blog_posts            CASCADE;
DROP TABLE IF EXISTS public.categories            CASCADE;


-- ────────────────────────────────────────────────────────────
-- PASO 2: TABLA `projects`
-- Alimenta: /systems.html y /system-post.html
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.projects (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at           timestamptz DEFAULT now(),
  client_name          text        NOT NULL,
  project_title        text,
  slug                 text        NOT NULL UNIQUE,
  category             text        NOT NULL
    CONSTRAINT projects_category_check
    CHECK (category IN (
      'VISUAL INFRASTRUCTURE',
      'DIGITAL SYSTEMS',
      'TANGIBLE MATTER',
      'CREATIVE DIRECTION',
      'SPECIAL OPERATIONS'
    )),
  year                 integer     NOT NULL,
  main_image           text,
  project_images       text[]      DEFAULT '{}'::text[],
  strategy_description text,
  is_featured          boolean     DEFAULT false
);

-- Índices de rendimiento
CREATE INDEX idx_projects_slug     ON public.projects (slug);
CREATE INDEX idx_projects_category ON public.projects (category);
CREATE INDEX idx_projects_featured ON public.projects (is_featured);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_projects"
  ON public.projects FOR SELECT TO anon USING (true);

CREATE POLICY "admin_all_projects"
  ON public.projects FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- PASO 3: TABLA `articles`
-- Alimenta: /currents.html y /current-post.html
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.articles (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz DEFAULT now(),
  title          text        NOT NULL,
  slug           text        NOT NULL UNIQUE,
  read_time      text,
  published_date text,
  body_content   text
);

-- Índices de rendimiento
CREATE INDEX idx_articles_slug       ON public.articles (slug);
CREATE INDEX idx_articles_created_at ON public.articles (created_at DESC);

-- RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_articles"
  ON public.articles FOR SELECT TO anon USING (true);

CREATE POLICY "admin_all_articles"
  ON public.articles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- PASO 4: TABLA `enlist_applications`
-- Recibe datos desde: /enlist.html
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.enlist_applications (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        timestamptz DEFAULT now(),
  brand_name        text        NOT NULL,
  contact_email     text        NOT NULL,
  intervention_flow text        NOT NULL
    CONSTRAINT enlist_applications_intervention_flow_check
    CHECK (intervention_flow IN (
      'VISUAL INFRASTRUCTURE',
      'DIGITAL SYSTEMS',
      'TANGIBLE MATTER',
      'CREATIVE DIRECTION',
      'SPECIAL OPERATIONS'
    )),
  scenario_desc     text,
  estimated_budget  text,
  status            text        DEFAULT 'PENDING_REVIEW'
);

-- Índices de rendimiento
CREATE INDEX idx_enlist_status     ON public.enlist_applications (status);
CREATE INDEX idx_enlist_created_at ON public.enlist_applications (created_at DESC);

-- RLS
ALTER TABLE public.enlist_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_enlist_applications"
  ON public.enlist_applications FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "admin_all_enlist_applications"
  ON public.enlist_applications FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- PASO 5: TABLA `analytics_events`
-- Telemetría de eventos internos (sin cookies, GDPR-safe)
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.analytics_events (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  event_name text        NOT NULL,
  metadata   jsonb       DEFAULT '{}'::jsonb
);

-- RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_analytics_events"
  ON public.analytics_events FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "admin_all_analytics_events"
  ON public.analytics_events FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- PASO 6: DATOS SEMILLA (seed data de arranque)
-- Puedes borrar este bloque si prefieres empezar vacío.
-- ────────────────────────────────────────────────────────────

-- Proyecto de ejemplo
INSERT INTO public.projects
  (client_name, project_title, slug, category, year, main_image, strategy_description, is_featured)
VALUES
  (
    'MODO PATRIA',
    'Sistema de Identidad Visual Estratégica',
    'modo-patria',
    'VISUAL INFRASTRUCTURE',
    2026,
    'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800',
    'Construcción de la infraestructura visual identitaria y sistema estratégico de marca para la firma streetwear.',
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- Artículo de ejemplo
INSERT INTO public.articles
  (title, slug, read_time, published_date, body_content)
VALUES
  (
    'DISCIPLINA EN ENTORNOS DE ALTA COMPETENCIA',
    'disciplina-en-entornos-de-alta-competencia',
    '4 MIN READ',
    'MAY 2026',
    '<p>El verdadero rendimiento se forja bajo la presión y el cálculo estratégico. Sin adornos superfluos, construimos estructuras visuales que resisten.</p>'
  )
ON CONFLICT (slug) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────

SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'articles', 'enlist_applications', 'analytics_events')
ORDER BY tablename;
