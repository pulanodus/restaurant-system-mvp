-- Create cart_items table for individual diner carts
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  diner_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  is_takeaway BOOLEAN DEFAULT FALSE,
  customizations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_diner_name ON cart_items(diner_name);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view cart items for their session" ON cart_items
  FOR SELECT USING (true);

CREATE POLICY "Users can insert cart items" ON cart_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update cart items" ON cart_items
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete cart items" ON cart_items
  FOR DELETE USING (true);
