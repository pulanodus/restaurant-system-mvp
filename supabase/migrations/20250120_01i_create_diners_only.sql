-- Create diners table only
-- This migration creates just the diners table

-- Create diners table if it doesn't exist
CREATE TABLE IF NOT EXISTS diners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for diners
CREATE INDEX IF NOT EXISTS idx_diners_session_id ON diners(session_id);
CREATE INDEX IF NOT EXISTS idx_diners_name ON diners(name);
CREATE INDEX IF NOT EXISTS idx_diners_joined_at ON diners(joined_at);

-- Enable RLS for diners
ALTER TABLE diners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for diners
DROP POLICY IF EXISTS "Users can view diners" ON diners;
DROP POLICY IF EXISTS "Users can insert diners" ON diners;
DROP POLICY IF EXISTS "Users can update diners" ON diners;
DROP POLICY IF EXISTS "Users can delete diners" ON diners;

CREATE POLICY "Users can view diners" ON diners
  FOR SELECT USING (true);

CREATE POLICY "Users can insert diners" ON diners
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update diners" ON diners
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete diners" ON diners
  FOR DELETE USING (true);

-- Add comment for documentation
COMMENT ON TABLE diners IS 'Diners participating in a session';
