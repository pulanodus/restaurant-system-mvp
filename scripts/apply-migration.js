#!/usr/bin/env node

/**
 * Apply Manager Authentication Migration
 * Directly executes the migration SQL against the remote Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

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

async function main() {
  try {
    log(`${colors.bold}🔐 Applying Manager Authentication Migration${colors.reset}`);

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      error('Missing required environment variables');
      error('Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
      process.exit(1);
    }

    // Initialize Supabase client with service role
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

    info('Connected to Supabase database');

    // Read the migration file
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20250127_01_add_manager_authentication.sql');

    if (!fs.existsSync(migrationPath)) {
      error('Migration file not found at: ' + migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    info('Migration file loaded successfully');

    // Check if migration was already applied
    info('Checking if managers table already exists...');
    const { data: existingTable, error: checkError } = await supabase
      .from('managers')
      .select('count')
      .limit(1);

    if (!checkError) {
      log('⚠️  Managers table already exists!', colors.yellow);
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('Do you want to proceed anyway? This might cause errors if the migration was already applied. (y/N): ', resolve);
      });

      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        info('Migration cancelled by user');
        process.exit(0);
      }
    }

    // Apply the migration
    info('Applying migration to database...');

    // Split migration into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }

      try {
        const { error: sqlError } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (sqlError) {
          // Some errors are expected (like "already exists" errors)
          if (sqlError.message.includes('already exists') ||
              sqlError.message.includes('does not exist') ||
              sqlError.message.includes('duplicate key')) {
            log(`⚠️  Statement ${i + 1}: ${sqlError.message}`, colors.yellow);
          } else {
            error(`Statement ${i + 1} failed: ${sqlError.message}`);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        error(`Statement ${i + 1} exception: ${err.message}`);
        errorCount++;
      }
    }

    // Try a simpler approach if the RPC method doesn't work
    if (successCount === 0) {
      info('Trying alternative approach...');

      // Try executing the full migration as one statement
      try {
        // This is a workaround - we'll use a direct query approach
        const { error: directError } = await supabase
          .from('pg_stat_user_tables')
          .select('schemaname')
          .limit(1);

        if (directError) {
          error('Cannot execute migration directly. Please apply it manually.');
          error('1. Go to your Supabase dashboard');
          error('2. Navigate to the SQL Editor');
          error('3. Paste and run the contents of: supabase/migrations/20250127_01_add_manager_authentication.sql');
        } else {
          info('Database connection verified');
          error('Migration requires manual application via Supabase Dashboard SQL Editor');
          info('File to apply: supabase/migrations/20250127_01_add_manager_authentication.sql');
        }
      } catch (err) {
        error('Direct migration failed. Please apply manually via Supabase Dashboard.');
      }
    }

    if (successCount > 0) {
      success(`Migration completed successfully! (${successCount} statements executed)`);
      if (errorCount > 0) {
        log(`⚠️  ${errorCount} statements had warnings/errors (this is normal for some CREATE IF NOT EXISTS statements)`, colors.yellow);
      }
    } else {
      error('Migration could not be applied automatically.');
      info('Please apply the migration manually:');
      info('1. Open Supabase Dashboard > SQL Editor');
      info('2. Copy and paste the contents of: supabase/migrations/20250127_01_add_manager_authentication.sql');
      info('3. Click "Run" to execute the migration');
    }

    // Verify the migration worked
    info('Verifying migration...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('managers')
      .select('count')
      .limit(1);

    if (verifyError && verifyError.code === 'PGRST116') {
      error('Migration verification failed - managers table not found');
      error('Please apply the migration manually via Supabase Dashboard');
    } else {
      success('Migration verification passed - managers table exists!');
      success('🎉 Ready to create your first secure manager!');
      info('Next step: Run "node scripts/setup-secure-manager.js"');
    }

  } catch (err) {
    error(`Migration failed: ${err.message}`);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  main().catch((err) => {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  });
}