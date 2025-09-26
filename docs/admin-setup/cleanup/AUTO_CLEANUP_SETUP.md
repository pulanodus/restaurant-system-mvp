# Auto-Cleanup Setup Guide

The automatic cleanup system is failing because the required environment variable is not configured. Here's how to fix it:

## Quick Fix

Add this line to your `.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## How to Get Your Service Role Key

1. **Go to your Supabase project dashboard**
2. **Navigate to Settings → API**
3. **Copy the "service_role" key** (not the "anon" key)
4. **Add it to your `.env.local` file**

## Example .env.local

```env
# Your existing variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Add this line for auto-cleanup
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## What This Enables

Once configured, the system will automatically:
- ✅ Clean up stale users every 3 minutes
- ✅ Fix "name already taken" issues before they happen
- ✅ Run cleanup when users enter PIN or try to log in
- ✅ Maintain the system without any manual intervention

## Security Note

The service role key has elevated permissions, so:
- ✅ Keep it in `.env.local` (never commit to git)
- ✅ Only use it on the server side (API routes)
- ✅ It's safe to use for the cleanup system

## After Adding the Key

1. **Restart your development server** (`npm run dev`)
2. **Check the console** - you should see auto-cleanup working
3. **Test it** - try logging in as a user who was stuck

## Troubleshooting

If you still see errors:
1. **Check the key is correct** - it should start with `eyJhbGciOiJIUzI1NiIs...`
2. **Restart the server** after adding the key
3. **Check the console** for more specific error messages

The system will work completely automatically once this is configured!
