/*
  # Create glossary projects table

  1. New Tables
    - `glossary_projects`
      - `id` (uuid, primary key) - Unique identifier for each project
      - `name` (text) - User-defined project name
      - `full_text` (text) - Complete text of the uploaded novel
      - `characters` (jsonb) - Array of extracted characters with details
      - `events` (jsonb) - Array of extracted story events
      - `locations` (jsonb) - Array of extracted locations
      - `terms` (jsonb) - Array of extracted terms for translation
      - `total_chunks` (integer) - Number of chunks processed
      - `created_at` (timestamptz) - Timestamp when project was created
      - `updated_at` (timestamptz) - Timestamp when project was last updated

  2. Security
    - Enable RLS on `glossary_projects` table
    - All data is public (no authentication required for this application)
    - Users can read all projects
    - Users can insert new projects
    - Users can update existing projects

  3. Indexes
    - Index on `created_at` for efficient sorting by date
    - Index on `name` for searching by project name
*/

CREATE TABLE IF NOT EXISTS glossary_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  full_text text NOT NULL,
  characters jsonb DEFAULT '[]'::jsonb,
  events jsonb DEFAULT '[]'::jsonb,
  locations jsonb DEFAULT '[]'::jsonb,
  terms jsonb DEFAULT '[]'::jsonb,
  total_chunks integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE glossary_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON glossary_projects
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access"
  ON glossary_projects
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access"
  ON glossary_projects
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_glossary_projects_created_at 
  ON glossary_projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_glossary_projects_name 
  ON glossary_projects(name);