-- Migration: Add `pin` to projects and `qty` to items

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS pin TEXT;

ALTER TABLE items
ADD COLUMN IF NOT EXISTS qty INTEGER NOT NULL DEFAULT 1;
