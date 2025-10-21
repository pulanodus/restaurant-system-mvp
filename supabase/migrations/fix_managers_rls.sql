-- Manager Authentication Table Migration
-- This migration creates a secure table for manager authentication
-- Replaces hardcoded PINs with proper database-stored credentials

-- Create managers table for secure authentication
CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'manager' CHECK (role IN ('manager', 'admin', 'supervisor')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  restaurant_id UUID REFERENCES restaurants(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_managers_username ON managers(username);
CREATE INDEX IF NOT EXISTS idx_managers_email ON managers(email);
CREATE INDEX IF NOT EXISTS idx_managers_restaurant_id ON managers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_managers_active ON managers(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_managers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_managers_updated_at
    BEFORE UPDATE ON managers
    FOR EACH ROW
    EXECUTE FUNCTION update_managers_updated_at();

-- Add RLS policies for security
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view managers (without sensitive data)
CREATE POLICY "Authenticated users can view managers" ON managers
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Service role can select managers (needed for authentication)
CREATE POLICY "Service role can select managers" ON managers
    FOR SELECT
    USING (auth.role() = 'service_role');

-- Policy: Service role can insert managers
CREATE POLICY "Service role can insert managers" ON managers
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Policy: Service role can update managers
CREATE POLICY "Service role can update managers" ON managers
    FOR UPDATE
    USING (auth.role() = 'service_role');

-- Policy: Service role can delete managers
CREATE POLICY "Service role can delete managers" ON managers
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Create function for manager authentication
CREATE OR REPLACE FUNCTION authenticate_manager(
    p_username TEXT,
    p_password_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager RECORD;
    v_result JSON;
BEGIN
    -- Check if manager exists and is active
    SELECT *
    INTO v_manager
    FROM managers
    WHERE username = p_username
      AND is_active = true
      AND (locked_until IS NULL OR locked_until < NOW());

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid credentials or account locked'
        );
    END IF;

    -- Verify password hash
    IF v_manager.password_hash = p_password_hash THEN
        -- Update last login and reset failed attempts
        UPDATE managers
        SET
            last_login_at = NOW(),
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE id = v_manager.id;

        -- Return success with manager info (excluding sensitive data)
        RETURN json_build_object(
            'success', true,
            'manager', json_build_object(
                'id', v_manager.id,
                'username', v_manager.username,
                'email', v_manager.email,
                'full_name', v_manager.full_name,
                'role', v_manager.role,
                'restaurant_id', v_manager.restaurant_id
            )
        );
    ELSE
        -- Increment failed login attempts
        UPDATE managers
        SET
            failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE
                WHEN failed_login_attempts + 1 >= 5
                THEN NOW() + INTERVAL '15 minutes'
                ELSE locked_until
            END
        WHERE id = v_manager.id;

        RETURN json_build_object(
            'success', false,
            'error', 'Invalid credentials'
        );
    END IF;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION authenticate_manager(TEXT, TEXT) TO service_role;

-- Create function to create a new manager (for setup)
CREATE OR REPLACE FUNCTION create_manager(
    p_username TEXT,
    p_password_hash TEXT,
    p_email TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'manager',
    p_restaurant_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager_id UUID;
BEGIN
    -- Insert new manager
    INSERT INTO managers (
        username,
        password_hash,
        email,
        full_name,
        role,
        restaurant_id
    )
    VALUES (
        p_username,
        p_password_hash,
        p_email,
        COALESCE(p_full_name, p_username),
        p_role,
        p_restaurant_id
    )
    RETURNING id INTO v_manager_id;

    RETURN json_build_object(
        'success', true,
        'manager_id', v_manager_id,
        'username', p_username
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Username or email already exists'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to create manager'
        );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION create_manager(TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;

-- Add comments for documentation
COMMENT ON TABLE managers IS 'Secure storage for manager authentication credentials';
COMMENT ON COLUMN managers.password_hash IS 'Bcrypt hashed password - never store plain text';
COMMENT ON COLUMN managers.failed_login_attempts IS 'Track failed login attempts for security';
COMMENT ON COLUMN managers.locked_until IS 'Account lock timestamp after failed attempts';
COMMENT ON FUNCTION authenticate_manager(TEXT, TEXT) IS 'Secure manager authentication with rate limiting';
COMMENT ON FUNCTION create_manager(TEXT, TEXT, TEXT, TEXT, TEXT, UUID) IS 'Create new manager with secure password storage';