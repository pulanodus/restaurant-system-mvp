#!/usr/bin/env node

/**
 * Secure Manager Setup Script
 * Creates initial manager credentials with proper password hashing
 * Replaces the hardcoded PIN system with secure database storage
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const readline = require('readline');
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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Utility functions
function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function askSecretQuestion(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    let input = '';
    process.stdin.on('data', (char) => {
      char = char.toString();

      if (char === '\n' || char === '\r' || char === '\u0004') {
        // Enter or Ctrl+D pressed
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(input);
        return;
      }

      if (char === '\u0003') {
        // Ctrl+C pressed
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        process.exit(1);
        return;
      }

      if (char === '\u007f') {
        // Backspace pressed
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }

      input += char;
      process.stdout.write('*');
    });
  });
}

// Validate environment variables
function validateEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    error('Missing required environment variables:');
    missing.forEach(envVar => {
      error(`  - ${envVar}`);
    });
    error('Please check your .env.local file');
    process.exit(1);
  }
}

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Validate password strength
function validatePassword(password) {
  const errors = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be no more than 128 characters long');
  }

  // Basic strength requirements (can be made stricter)
  if (password === '123456' || password === 'password' || password === 'admin') {
    errors.push('Password is too common - please choose a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Hash password using bcrypt
async function hashPassword(plainTextPassword) {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(plainTextPassword, salt);
  } catch (err) {
    throw new Error(`Failed to hash password: ${err.message}`);
  }
}

// Create manager in database
async function createManager(supabase, managerData) {
  try {
    const { data, error } = await supabase.rpc('create_manager', {
      p_username: managerData.username,
      p_password_hash: managerData.passwordHash,
      p_email: managerData.email || null,
      p_full_name: managerData.fullName || managerData.username,
      p_role: managerData.role || 'manager',
      p_restaurant_id: null // Will be set later when multi-tenant is fully implemented
    });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (err) {
    throw new Error(`Failed to create manager: ${err.message}`);
  }
}

// List existing managers
async function listManagers(supabase) {
  try {
    const { data, error } = await supabase
      .from('managers')
      .select('id, username, email, full_name, role, is_active, created_at, last_login_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch managers: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    warning(`Could not fetch existing managers: ${err.message}`);
    return [];
  }
}

// Main setup function
async function main() {
  try {
    log(`${colors.bold}${colors.cyan}🔐 Secure Manager Setup${colors.reset}`);
    log('This script will help you create secure manager credentials');
    log('');

    // Validate environment
    info('Validating environment variables...');
    validateEnvironment();
    success('Environment validation passed');

    // Initialize Supabase
    info('Connecting to database...');
    const supabase = initializeSupabase();
    success('Database connection established');

    // Check if migration has been run
    info('Checking database schema...');
    const { error: schemaError } = await supabase
      .from('managers')
      .select('count')
      .limit(1);

    if (schemaError && schemaError.code === 'PGRST116') {
      error('The managers table does not exist!');
      error('Please run the database migration first:');
      error('  supabase migration up');
      error('  or apply: supabase/migrations/20250127_01_add_manager_authentication.sql');
      process.exit(1);
    }

    success('Database schema validated');

    // List existing managers
    info('Checking existing managers...');
    const existingManagers = await listManagers(supabase);

    if (existingManagers.length > 0) {
      warning('Existing managers found:');
      existingManagers.forEach((manager, index) => {
        log(`  ${index + 1}. ${manager.username} (${manager.full_name}) - ${manager.role} - ${manager.is_active ? 'Active' : 'Inactive'}`);
      });
      log('');
    }

    // Get manager details from user
    log(`${colors.bold}Manager Details:${colors.reset}`);

    const username = await askQuestion('Username: ');
    if (!username || username.trim().length === 0) {
      error('Username is required');
      process.exit(1);
    }

    // Check if username already exists
    const existingManager = existingManagers.find(m => m.username.toLowerCase() === username.toLowerCase().trim());
    if (existingManager) {
      error(`A manager with username "${username}" already exists`);
      process.exit(1);
    }

    const fullName = await askQuestion('Full Name (optional): ');
    const email = await askQuestion('Email (optional): ');

    let role = await askQuestion('Role (manager/admin/supervisor) [manager]: ');
    if (!role || role.trim().length === 0) {
      role = 'manager';
    }

    if (!['manager', 'admin', 'supervisor'].includes(role.toLowerCase())) {
      error('Invalid role. Must be: manager, admin, or supervisor');
      process.exit(1);
    }

    // Get and validate password
    let password;
    while (true) {
      password = await askSecretQuestion('Password: ');

      if (!password || password.length === 0) {
        error('Password is required');
        continue;
      }

      const validation = validatePassword(password);
      if (!validation.isValid) {
        error('Password validation failed:');
        validation.errors.forEach(err => {
          error(`  - ${err}`);
        });
        continue;
      }

      const confirmPassword = await askSecretQuestion('Confirm Password: ');
      if (password !== confirmPassword) {
        error('Passwords do not match');
        continue;
      }

      break;
    }

    // Display summary
    log('');
    log(`${colors.bold}Manager Summary:${colors.reset}`);
    log(`  Username: ${username}`);
    log(`  Full Name: ${fullName || username}`);
    log(`  Email: ${email || 'Not provided'}`);
    log(`  Role: ${role.toLowerCase()}`);
    log('');

    const confirm = await askQuestion('Create this manager? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      warning('Manager creation cancelled');
      process.exit(0);
    }

    // Hash password
    info('Hashing password...');
    const passwordHash = await hashPassword(password);
    success('Password hashed successfully');

    // Create manager
    info('Creating manager in database...');
    const result = await createManager(supabase, {
      username: username.toLowerCase().trim(),
      passwordHash,
      email: email.trim() || null,
      fullName: fullName.trim() || username,
      role: role.toLowerCase()
    });

    if (result.success) {
      success('Manager created successfully!');
      success(`Manager ID: ${result.manager_id}`);
      success(`Username: ${result.username}`);
      log('');
      success('🎉 Setup complete! You can now use these credentials to authenticate.');
      log('');
      warning('Security Notes:');
      warning('  - The hardcoded PINs have been replaced with secure database authentication');
      warning('  - Passwords are hashed using bcrypt with 12 salt rounds');
      warning('  - Failed login attempts are tracked and accounts can be temporarily locked');
      warning('  - Make sure to update your frontend to use username/password instead of PIN');
    } else {
      error(`Failed to create manager: ${result.error}`);
      process.exit(1);
    }

  } catch (err) {
    error(`Setup failed: ${err.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  log('\n');
  warning('Setup cancelled by user');
  rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  rl.close();
  process.exit(0);
});

// Check if script is being run directly
if (require.main === module) {
  main().catch((err) => {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  validatePassword,
  hashPassword,
  createManager
};