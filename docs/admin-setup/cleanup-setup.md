# Automatic Stale User Cleanup System

This document explains the **completely automatic** stale user cleanup system that resolves the issue where users get stuck as permanently active due to logout failures. **No manual intervention required!**

## The Problem

Some users become permanently stuck as `isActive: true` in the database when:
- Network issues occur during logout
- Browser is closed before logout completes
- Race conditions in state updates
- Error handling gaps in the logout process

This prevents them from logging back in, showing "name already taken" errors.

## The Solution

The **completely automatic** cleanup system identifies and fixes stale users by:
1. **Background Service**: Runs cleanup every 3 minutes automatically
2. **Middleware**: Triggers cleanup on every user request (every 2 minutes)
3. **User Actions**: Runs cleanup when users enter PIN or try to log in
4. **Smart Detection**: Finds users active for more than 3 hours with no recent activity
5. **Auto-Fix**: Marks them as inactive with a logout timestamp
6. **Seamless**: Users can log back in normally without any manual intervention

## ✅ **Zero Manual Intervention Required!**

The system is designed to be **completely hands-off**:
- ✅ **Runs automatically** - No setup needed
- ✅ **Self-healing** - Fixes issues before users notice
- ✅ **No configuration** - Works out of the box
- ✅ **No maintenance** - Restaurant staff never needs to do anything
- ✅ **Fail-safe** - If cleanup fails, it doesn't break the user experience

## How It Works Automatically

### 🤖 **Background Service** (Every 3 minutes)
- Runs automatically when the app loads
- No configuration needed
- Cleans up stale users in the background
- Never interrupts user experience

### 🚪 **Middleware** (Every 2 minutes on user requests)
- Triggers cleanup when users visit key pages
- Runs on `/scan/`, `/session/`, `/cart-review`, `/admin/`
- Prevents excessive API calls with smart throttling
- Works silently in the background

### 👤 **User Action Triggers**
- **PIN Entry**: Runs cleanup when user enters PIN
- **Login Attempt**: Runs cleanup when user tries to log in
- **Logout Success**: Runs cleanup after successful logout
- **Smart Timing**: Only runs if enough time has passed since last cleanup

### 🔧 **Admin Interface** (Optional - for monitoring only)

Access the cleanup interface at: `http://localhost:3004/admin/cleanup`

**Features (for monitoring only - system runs automatically):**
- **View Statistics**: See how many users were cleaned automatically
- **Monitor Health**: Check stale user percentages
- **Manual Override**: Force immediate cleanup if needed (rarely needed)

### 🛠️ **Manual Commands** (Optional - for debugging only)

Use the test script for debugging (system runs automatically):

```bash
# Check what the system has been doing automatically
node scripts/test-cleanup.js check

# Force immediate cleanup (rarely needed)
node scripts/test-cleanup.js clean
```

## API Endpoints

### GET /api/cleanup/stale-users
Check for stale users without modifying data.

**Response:**
```json
{
  "message": "Found 5 stale active users",
  "staleUsers": [
    {
      "sessionId": "uuid",
      "tableNumber": "B1",
      "userName": "Rony",
      "lastActive": "2025-09-24T22:35:42.866Z",
      "hoursInactive": 25.5,
      "hasLogoutTime": false
    }
  ],
  "summary": {
    "totalSessions": 3,
    "totalActiveUsers": 12,
    "totalStaleUsers": 5,
    "stalePercentage": 42
  }
}
```

### POST /api/cleanup/stale-users
Clean up stale users (requires `CLEANUP_API_KEY`).

**Headers:**
```
Authorization: Bearer YOUR_CLEANUP_API_KEY
Content-Type: application/json
```

**Response:**
```json
{
  "message": "Successfully cleaned 5 stale users",
  "cleanedUsers": [...],
  "summary": {
    "totalSessions": 3,
    "totalCleanedUsers": 5,
    "sessionsUpdated": 3,
    "sessionsFailed": 0
  }
}
```

### POST /api/cron/cleanup-stale-users
Automated cleanup endpoint for cron jobs (requires `CRON_SECRET`).

## How It Works

### 1. Identification Process
- Scans all active sessions
- Checks each diner's `lastActive` timestamp
- Identifies users active for >2 hours with no logout time
- Calculates hours of inactivity

### 2. Cleanup Process
- Marks stale users as `isActive: false`
- Adds `logoutTime` timestamp
- Preserves `lastActive` for audit trail
- Updates session in database

### 3. Audit Logging
- Records all cleanup actions in `audit_logs` table
- Includes details about cleaned users
- Tracks success/failure rates
- Provides audit trail for compliance

## Monitoring

### Check Cleanup Effectiveness
```bash
# See how many users were cleaned in the last 24 hours
node scripts/test-cleanup.js check
```

### View Audit Logs
```sql
-- Check recent cleanup actions
SELECT * FROM audit_logs 
WHERE action = 'STALE_USER_CLEANUP' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Monitor Stale User Percentage
- **0-25%**: Healthy system
- **25-50%**: Some logout issues
- **50%+**: Significant logout problems (investigate)

## Troubleshooting

### Common Issues

**1. "Unauthorized" errors**
- Check that `CLEANUP_API_KEY` and `CRON_SECRET` are set correctly
- Verify the keys match in your environment variables

**2. "Service role key not configured"**
- Add `SUPABASE_SERVICE_ROLE_KEY` to your environment
- Get this from your Supabase project settings

**3. Cleanup not working**
- Check database connectivity
- Verify the `audit_logs` table exists
- Check console logs for detailed error messages

### Debug Mode
Enable detailed logging by checking the browser console when using the admin interface.

## Best Practices

1. **Run cleanup regularly**: Every hour for active restaurants
2. **Monitor metrics**: Watch the stale user percentage
3. **Investigate patterns**: If cleanup finds many users, investigate logout issues
4. **Test in staging**: Verify cleanup works before production
5. **Backup before cleanup**: Always have recent database backups

## Security Considerations

- Keep `CLEANUP_API_KEY` and `CRON_SECRET` secure
- Use different keys for different environments
- Rotate keys regularly
- Monitor cleanup API access logs
- Restrict cron endpoint to known IPs if possible

## Integration with Existing System

The cleanup system works alongside your existing logout process:
- **Normal logout**: Still works as before
- **Failed logout**: Cleanup system handles the cleanup
- **Returning users**: Can log back in after cleanup
- **Active users**: Not affected by cleanup process

This makes your system self-healing and reduces manual intervention.
