-- DesignBudget Hub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table (global settings)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT 'default-project',
  name TEXT NOT NULL,
  total_budget NUMERIC(12, 2) NOT NULL DEFAULT 50000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  author TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site logs table
CREATE TABLE IF NOT EXISTS site_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('update', 'plan', 'issue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moodboard table
CREATE TABLE IF NOT EXISTS moodboard (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  author TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  text TEXT,
  audio_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('text', 'audio')),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline table
CREATE TABLE IF NOT EXISTS timeline (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in-progress', 'delayed', 'completed')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team passkeys table (for enhanced authentication)
CREATE TABLE IF NOT EXISTS team_passkeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passkey TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default passkey (you should change this!)
INSERT INTO team_passkeys (passkey) VALUES ('team') ON CONFLICT (passkey) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_site_logs_project_id ON site_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_moodboard_project_id ON moodboard(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_project_id ON timeline(project_id);

-- Row Level Security (RLS) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moodboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_passkeys ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations for now (you can restrict later based on project_id or user auth)
-- For a single-team project, we allow all authenticated requests
CREATE POLICY "Allow all operations on projects" ON projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on site_logs" ON site_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on moodboard" ON moodboard
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on chat_messages" ON chat_messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on timeline" ON timeline
  FOR ALL USING (true) WITH CHECK (true);

-- Allow reading passkeys for verification (but not writing)
CREATE POLICY "Allow reading team_passkeys" ON team_passkeys
  FOR SELECT USING (is_active = true);

-- Storage buckets setup (run these in Supabase Storage section or via SQL)
-- Note: You'll need to create these buckets in the Supabase dashboard under Storage
-- Bucket names: 'moodboard-images' and 'voice-notes'
-- Make them public for easier access, or use signed URLs

