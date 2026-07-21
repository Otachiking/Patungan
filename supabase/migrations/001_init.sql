-- PtPtLah — Supabase Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Projects ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  share_slug  TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  edit_token  TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  currency    TEXT NOT NULL DEFAULT 'IDR',
  tax_rate    NUMERIC(5,4) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Persons ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS persons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  "order"     BIGINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS persons_project_id_idx ON persons(project_id);

-- ─── Items ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  price               INTEGER NOT NULL DEFAULT 0,  -- in Rupiah (integer, no decimal)
  paid_by_person_id   UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  "order"             BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS items_project_id_idx ON items(project_id);

-- ─── Item Participants ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS item_participants (
  item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  person_id   UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  weight      NUMERIC(10,4) NOT NULL DEFAULT 1,  -- 1 = equal split, extensible for v2
  PRIMARY KEY (item_id, person_id)
);

CREATE INDEX IF NOT EXISTS item_participants_item_id_idx ON item_participants(item_id);
CREATE INDEX IF NOT EXISTS item_participants_person_id_idx ON item_participants(person_id);

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
-- Allow public access (anon role) for all operations in MVP

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to projects" ON projects;
CREATE POLICY "Allow public full access to projects" ON projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access to persons" ON persons;
CREATE POLICY "Allow public full access to persons" ON persons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access to items" ON items;
CREATE POLICY "Allow public full access to items" ON items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access to item_participants" ON item_participants;
CREATE POLICY "Allow public full access to item_participants" ON item_participants FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to public roles
GRANT ALL ON projects TO anon, authenticated;
GRANT ALL ON persons TO anon, authenticated;
GRANT ALL ON items TO anon, authenticated;
GRANT ALL ON item_participants TO anon, authenticated;
