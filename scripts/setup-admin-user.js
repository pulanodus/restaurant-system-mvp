#!/usr/bin/env node

/**
 * Script to set up admin users
 * This helps you assign admin roles to users for accessing admin features
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
  try {
    console.log('👥 Fetching all users...\n');
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  No users found.');
      return [];
    }

    console.log(`📋 Found ${users.length} users:`);
    console.log('─'.repeat(80));
    console.log('ID'.padEnd(40) + 'Email'.padEnd(30) + 'Role');
    console.log('─'.repeat(80));
    
    const usersWithRoles = [];
    
    for (const user of users) {
      // Get user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = profile?.role || 'user';
      usersWithRoles.push({ ...user, role });
      
      console.log(
        user.id.substring(0, 8) + '...'.padEnd(32) + 
        (user.email || 'No email').padEnd(30) + 
        role
      );
    }
    
    console.log('─'.repeat(80));
    return usersWithRoles;
    
  } catch (error) {
    console.error('❌ Failed to fetch users:', error.message);
    return [];
  }
}

async function setUserRole(userId, role) {
  try {
    console.log(`🔧 Setting role '${role}' for user ${userId.substring(0, 8)}...`);
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log('✅ Updated existing profile with new role');
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{ id: userId, role }]);
      
      if (insertError) {
        throw insertError;
      }
      
      console.log('✅ Created new profile with role');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to set user role:', error.message);
    return false;
  }
}

async function createProfilesTable() {
  try {
    console.log('🔧 Creating profiles table if it doesn\'t exist...');
    
    // Create profiles table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
          role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'staff')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
        CREATE POLICY "Users can view their own profile" ON profiles
          FOR SELECT USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
        CREATE POLICY "Users can update their own profile" ON profiles
          FOR UPDATE USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
        CREATE POLICY "Service role can manage all profiles" ON profiles
          FOR ALL USING (true);
      `
    });
    
    if (createError) {
      // Try alternative approach
      console.log('⚠️  RPC failed, trying direct table creation...');
      
      const { error: directError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (directError && directError.code === 'PGRST116') {
        console.log('❌ Profiles table does not exist and cannot be created via this script.');
        console.log('   Please create it manually in your Supabase dashboard:');
        console.log('   1. Go to Table Editor');
        console.log('   2. Create new table called "profiles"');
        console.log('   3. Add columns: id (uuid, primary key), role (text, default "user")');
        console.log('   4. Set up RLS policies as needed');
        return false;
      }
    }
    
    console.log('✅ Profiles table is ready');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to create profiles table:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Admin User Setup Script\n');
  
  // Create profiles table if needed
  const tableReady = await createProfilesTable();
  if (!tableReady) {
    console.log('\n❌ Cannot proceed without profiles table');
    return;
  }
  
  // List all users
  const users = await listUsers();
  
  if (users.length === 0) {
    console.log('\nℹ️  No users to manage.');
    return;
  }
  
  console.log('\n📝 Commands:');
  console.log('   set-admin <user-id>    - Set user as admin');
  console.log('   set-user <user-id>     - Set user as regular user');
  console.log('   set-staff <user-id>    - Set user as staff');
  console.log('   list                   - List all users again');
  console.log('   quit                   - Exit script');
  console.log('');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askCommand = () => {
    rl.question('Enter command: ', async (input) => {
      const [command, userId] = input.trim().split(' ');
      
      switch (command.toLowerCase()) {
        case 'set-admin':
          if (!userId) {
            console.log('❌ Please provide a user ID');
          } else {
            await setUserRole(userId, 'admin');
          }
          break;
          
        case 'set-user':
          if (!userId) {
            console.log('❌ Please provide a user ID');
          } else {
            await setUserRole(userId, 'user');
          }
          break;
          
        case 'set-staff':
          if (!userId) {
            console.log('❌ Please provide a user ID');
          } else {
            await setUserRole(userId, 'staff');
          }
          break;
          
        case 'list':
          await listUsers();
          break;
          
        case 'quit':
        case 'exit':
          console.log('👋 Goodbye!');
          rl.close();
          return;
          
        default:
          console.log('❌ Unknown command. Available: set-admin, set-user, set-staff, list, quit');
      }
      
      console.log('');
      askCommand();
    });
  };
  
  askCommand();
}

// Handle command line arguments
if (process.argv.length > 2) {
  const command = process.argv[2];
  const userId = process.argv[3];
  
  switch (command) {
    case 'set-admin':
      if (userId) {
        setUserRole(userId, 'admin').then(() => process.exit(0));
      } else {
        console.log('❌ Please provide a user ID');
        process.exit(1);
      }
      break;
      
    case 'list':
      listUsers().then(() => process.exit(0));
      break;
      
    default:
      console.log('❌ Unknown command. Available: set-admin, list');
      process.exit(1);
  }
} else {
  // Interactive mode
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}
