# Daily Reset Commands for Development

## Quick Daily Reset (No Authentication Required)

### Option 1: Direct API Call
```bash
curl -X POST "http://localhost:3000/api/test/daily-reset" | jq .
```

### Option 2: Test Script
```bash
node docs/development/scripts/test-daily-reset.js
```

### Option 3: Manual curl with pretty output
```bash
curl -s -X POST "http://localhost:3000/api/test/daily-reset" \
  -H "Content-Type: application/json" | \
  jq '{success: .success, message: .message, sessions_reset: .data.sessions_reset, reset_time: .data.reset_time}'
```

## What the Daily Reset Does

✅ **Marks all active sessions as completed**
✅ **Clears all tables (sets occupied = false)**
✅ **Removes old cart items (24+ hours old)**
✅ **Cleans up all notifications**
✅ **Resets the system for a fresh day**

## Production vs Development

- **Production**: Uses `/api/admin/daily-reset` (requires admin authentication)
- **Development**: Uses `/api/test/daily-reset` (no authentication required)
- **Admin Dashboard**: Now uses `/api/test/daily-reset` (works in development)
- **Automatic**: Uses `/api/cron/daily-reset` (runs at 3AM with CRON_SECRET)

## Verification Commands

### Check table status:
```bash
curl -s "http://localhost:3000/api/tables" | jq '.data[] | select(.occupied == true)'
```

### Check active sessions:
```bash
curl -s "http://localhost:3000/api/sessions" | jq '.sessions[] | select(.status == "active")'
```

### Count total tables:
```bash
curl -s "http://localhost:3000/api/tables" | jq '.data | length'
```
