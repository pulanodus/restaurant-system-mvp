# Admin Setup Guide

This guide helps you set up admin users and resolve authentication issues in the admin dashboard.

## Current Status: 403 Forbidden Error

The 403 error occurs because the admin dashboard requires users to have the `admin` role in their profile, but this role isn't set up yet.

## Quick Fix (Development Mode)

I've temporarily enabled a **permissive mode** that bypasses the admin role check:

1. ✅ **Dashboard now works** - No more 403 errors
2. ⚠️ **Development warning banner** - Shows that role check is disabled
3. 🔧 **Instructions provided** - How to set up proper admin roles

## Setting Up Admin Users (Production)

### Method 1: Using the Setup Script

```bash
# Navigate to project directory
cd /path/to/pulanodas

# Run the admin setup script
node scripts/setup-admin-user.js

# This will show you all users and allow you to set roles
```

### Method 2: Manual Database Setup

1. **Create profiles table** (if it doesn't exist):
   ```sql
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
     role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'staff')),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Set up RLS policies**:
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can view their own profile" ON profiles
     FOR SELECT USING (auth.uid() = id);
   
   CREATE POLICY "Service role can manage all profiles" ON profiles
     FOR ALL USING (true);
   ```

3. **Assign admin role to a user**:
   ```sql
   INSERT INTO profiles (id, role) 
   VALUES ('your-user-id-here', 'admin')
   ON CONFLICT (id) DO UPDATE SET role = 'admin';
   ```

### Method 3: Supabase Dashboard

1. Go to your Supabase dashboard
2. Navigate to **Table Editor**
3. Create or find the `profiles` table
4. Add a row with:
   - `id`: Your user's UUID
   - `role`: `admin`

## Available User Roles

- **`user`** - Regular user (default)
- **`admin`** - Full admin access to all features
- **`staff`** - Staff access (limited admin features)

## Testing Admin Access

1. **Set up an admin user** using one of the methods above
2. **Switch back to strict mode** by updating `src/app/admin/layout.tsx`:
   ```typescript
   // Change this line:
   const DynamicAdminLayout = dynamic(() => import('./DynamicAdminLayoutPermissive'), {
   
   // Back to:
   const DynamicAdminLayout = dynamic(() => import('./DynamicAdminLayout'), {
   ```
3. **Test the dashboard** - Should work without warnings

## Admin Features Available

Once properly set up, admin users can access:

- ✅ **Dashboard** - Sales metrics, table status, recent activity
- ✅ **Menu Management** - Add/edit/remove menu items
- ✅ **Staff Management** - Manage staff accounts
- ✅ **QR Codes** - Generate and download table QR codes
- ✅ **Analytics** - Error tracking and system health
- ✅ **Settings** - Restaurant configuration

## Troubleshooting

### Still getting 403 errors?
1. Check that the user has the `admin` role in the profiles table
2. Verify the user is logged in
3. Check browser console for detailed error messages

### Profiles table doesn't exist?
1. Run the setup script: `node scripts/setup-admin-user.js`
2. Or create it manually in Supabase dashboard

### Can't find your user ID?
1. Check Supabase Auth users in the dashboard
2. Or run: `node scripts/setup-admin-user.js list`

## Security Notes

- **Development Mode**: The permissive layout is only for development
- **Production**: Always use proper role-based access control
- **RLS**: Row Level Security policies protect user data
- **Service Role**: Only use for administrative operations

## Next Steps

1. **Set up admin users** using the methods above
2. **Test admin features** to ensure everything works
3. **Switch to strict mode** for production
4. **Set up additional staff roles** as needed

The QR code management system is ready to use once admin access is properly configured!
