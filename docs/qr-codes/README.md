# QR Code Management System

This document explains how to use the QR code system for restaurant table management.

## Overview

The QR code system allows diners to scan codes placed on tables to join table sessions and start ordering. Each table has a unique QR code that directs diners to the appropriate table page.

## How It Works

### 1. QR Code Generation
- Each table gets a unique QR code that points to `/scan/{tableId}`
- QR codes are generated as PNG images (256x256 pixels)
- **Brand blue color** (`#00d9ff`) for the QR code pattern with white background
- Codes are stored in the database as data URLs in the `tables.qr_code_url` field

### 2. Diner Flow
1. **Diner arrives at a table** and scans the QR code on that table
2. **Redirected to `/scan/{tableId}` page** for that specific table
3. **Two options available**:
   - **"Share Table" tab**: Shows the table's QR code for other diners to scan and join
   - **"Join Table" tab**: Allows joining the table session (new or existing)
4. **Enter PIN if required** (check with server)
5. **Enter name to join session**
6. **Redirected to menu** for ordering

**Key Point**: Each table has ONE QR code that directs diners to join THAT specific table's session. There's no need to scan "another" table's QR code.

### 3. Admin Management
- Admin can view all table QR codes at `/admin/qr-codes`
- Download individual QR codes as PNG files
- Print QR codes for physical placement
- Generate QR codes for all tables at once

## Files Created/Modified

### New Files
- `src/app/api/admin/qr-codes/route.ts` - API endpoints for QR code generation
- `src/app/admin/qr-codes/page.tsx` - Admin interface for QR code management
- `scripts/generate-table-qr-codes.js` - Script to generate QR codes for existing tables

### Modified Files
- `src/lib/qr-code-generator.ts` - Enhanced with batch generation and validation
- `src/app/admin/DynamicAdminLayout.tsx` - Added QR Codes navigation item

## Usage Instructions

### For Restaurant Staff

1. **Generate QR Codes**:
   - Go to Admin Panel → QR Codes
   - Click "Refresh" to generate QR codes for all tables
   - Download individual codes or all codes at once

2. **Print QR Codes**:
   - Use "Print" button for individual codes
   - Use "Print All" for batch printing
   - Recommended size: 3x3 inches minimum
   - Laminate for durability

3. **Place QR Codes**:
   - Attach QR codes to each table
   - Ensure codes are visible and easily scannable
   - Consider table tents or stands

### For Diners

1. **Scan QR Code**:
   - Open phone camera or QR scanner app
   - Point at table's QR code
   - Tap notification to open restaurant page

2. **Join Table**:
   - Enter PIN if prompted (check with server)
   - Enter your name
   - Start ordering or join existing session

## API Endpoints

### GET /api/admin/qr-codes
Generates QR codes for all active tables.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "tableId": "uuid",
      "tableNumber": "A1",
      "restaurantId": "uuid",
      "qrCodeDataURL": "data:image/png;base64,...",
      "scanURL": "https://yourdomain.com/scan/uuid"
    }
  ],
  "count": 10
}
```

### POST /api/admin/qr-codes
Generates QR code for a specific table.

**Request**:
```json
{
  "tableId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tableId": "uuid",
    "tableNumber": "A1",
    "qrCodeDataURL": "data:image/png;base64,...",
    "scanURL": "https://yourdomain.com/scan/uuid"
  }
}
```

## Script Usage

Generate QR codes for all existing tables:

```bash
cd /path/to/pulanodas
node scripts/generate-table-qr-codes.js
```

**Prerequisites**:
- Node.js installed
- Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL` (optional, defaults to localhost:3000)

## QR Code Structure

Each QR code contains a URL in this format:
```
https://yourdomain.com/scan/{tableId}
```

Where `{tableId}` is the UUID of the table from the database.

### QR Code Design
- **Color**: Brand blue (`#00d9ff`) with white background
- **Size**: 256x256 pixels (scalable)
- **Format**: PNG and SVG support
- **Margin**: 2px border for better scanning

## Security Considerations

1. **Table IDs**: Use UUIDs for table IDs to prevent enumeration
2. **PIN Protection**: Tables can have PINs for additional security
3. **Session Validation**: All sessions are validated before allowing access
4. **Multi-tenant**: QR codes are restaurant-specific

## Troubleshooting

### QR Code Not Working
1. Check if table exists and is active
2. Verify QR code URL is correct
3. Test with manual table ID entry

### Generation Errors
1. Check database connection
2. Verify table data integrity
3. Check QR code library dependencies

### Scanning Issues
1. Ensure QR code is clear and readable
2. Check lighting conditions
3. Try different QR scanner apps

## Future Enhancements

- [ ] QR code branding with restaurant logo
- [ ] Dynamic QR codes with session tokens
- [ ] QR code analytics and tracking
- [ ] Bulk QR code printing templates
- [ ] QR code validation and health checks
