#!/usr/bin/env node

/**
 * Create Test Manager - Non-interactive version
 * Creates a test manager account for demonstration
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Configuration
const SALT_ROUNDS = 12;

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function hashPassword(plainTextPassword) {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(plainTextPassword, salt);
  } catch (err) {
    throw new Error(`Failed to hash password: ${err.message}`);
  }
}

async function main() {
  try {
    log(`${colors.bold}🔐 Creating Test Manager Account${colors.reset}`);

    // Validate environment
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      error('Missing required environment variables');
      process.exit(1);
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    success('Database connection established');

    // Test manager credentials (you can change these)
    const testManager = {
      username: 'admin',
      password: 'admin123',  // Simple password for testing
      email: 'admin@restaurant.com',
      fullName: 'Restaurant Administrator',
      role: 'admin'
    };

    info(`Creating test manager: ${testManager.username}`);

    // Check if manager already exists
    try {
      const { data: existingManagers } = await supabase
        .from('managers')
        .select('username')
        .eq('username', testManager.username);

      if (existingManagers && existingManagers.length > 0) {
        warning(`Manager '${testManager.username}' already exists!`);
        info('You can use these credentials to test:');
        info(`Username: ${testManager.username}`);
        info(`Password: ${testManager.password}`);
        return;
      }
    } catch (checkError) {
      // Ignore check errors - table might not exist yet
    }

    // Hash password
    info('Hashing password...');
    const passwordHash = await hashPassword(testManager.password);

    // Create manager using database function
    info('Creating manager in database...');
    const { data: result, error: createError } = await supabase.rpc('create_manager', {
      p_username: testManager.username,
      p_password_hash: passwordHash,
      p_email: testManager.email,
      p_full_name: testManager.fullName,
      p_role: testManager.role,
      p_restaurant_id: null
    });

    if (createError) {
      error(`Failed to create manager: ${createError.message}`);
      if (createError.message.includes('could not find function')) {
        error('The create_manager function was not found.');
        error('Please ensure the migration has been applied correctly.');
      }
      process.exit(1);
    }

    if (result && result.success) {
      success('🎉 Test manager created successfully!');
      success('');
      success('TEST CREDENTIALS:');
      success(`Username: ${testManager.username}`);
      success(`Password: ${testManager.password}`);
      success(`Email: ${testManager.email}`);
      success(`Role: ${testManager.role}`);
      success(`Manager ID: ${result.manager_id}`);
      success('');
      warning('SECURITY NOTE:');
      warning('These are test credentials! Change them in production.');
      warning('The hardcoded PIN authentication has been replaced.');
      success('');
      info('Next steps:');
      info('1. Update your frontend to use username/password instead of PIN');
      info('2. Test authentication with the new secure endpoint');
      info('3. Create additional managers as needed');

    } else {
      error('Failed to create manager: ' + (result?.error || 'Unknown error'));
    }

  } catch (err) {
    error(`Setup failed: ${err.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch((err) => {
  error(`Unexpected error: ${err.message}`);
  process.exit(1);
});