-- Create remaining missing tables
-- This migration creates the remaining tables needed for multi-tenant architecture

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
CREATE POLICY "Users can view diners" ON diners
  FOR SELECT USING (true);

CREATE POLICY "Users can insert diners" ON diners
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update diners" ON diners
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete diners" ON diners
  FOR DELETE USING (true);

-- Create split_bills table if it doesn't exist
CREATE TABLE IF NOT EXISTS split_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  diner_name TEXT NOT NULL, -- The diner who initiated the split
  participants TEXT[] NOT NULL, -- Array of diner names participating in the split
  split_count INTEGER NOT NULL DEFAULT 1,
  original_price DECIMAL(10,2) NOT NULL,
  split_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for split_bills
CREATE INDEX IF NOT EXISTS idx_split_bills_session_id ON split_bills(session_id);
CREATE INDEX IF NOT EXISTS idx_split_bills_diner_name ON split_bills(diner_name);
CREATE INDEX IF NOT EXISTS idx_split_bills_created_at ON split_bills(created_at);

-- Create updated_at trigger for split_bills
CREATE OR REPLACE FUNCTION update_split_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_split_bills_updated_at
  BEFORE UPDATE ON split_bills
  FOR EACH ROW
  EXECUTE FUNCTION update_split_bills_updated_at();

-- Enable RLS for split_bills
ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for split_bills
CREATE POLICY "Users can view split bills" ON split_bills
  FOR SELECT USING (true);

CREATE POLICY "Users can insert split bills" ON split_bills
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update split bills" ON split_bills
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete split bills" ON split_bills
  FOR DELETE USING (true);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'bill_request', 'help_request', 'payment_request', etc.
  message TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'acknowledged', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_session_id ON notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Create updated_at trigger for notifications
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view notifications" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update notifications" ON notifications
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete notifications" ON notifications
  FOR DELETE USING (true);

-- Add comments for documentation
COMMENT ON TABLE diners IS 'Diners participating in a session';
COMMENT ON TABLE split_bills IS 'Split bill information for shared items';
COMMENT ON TABLE notifications IS 'Notifications and requests from diners to staff';
