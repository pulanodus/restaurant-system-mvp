import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateQRCodeSVG, generateQRCodeURL } from '@/lib/qr-code-generator';

/**
 * GET /api/admin/qr-codes
 * Generate QR codes for all active tables
 */
export async function GET(request: NextRequest) {
  try {
    // Get all active tables
    const { data: tables, error } = await supabaseServer
      .from('tables')
      .select('id, table_number, restaurant_id')
      .eq('is_active', true)
      .order('table_number');
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: `Failed to fetch tables: ${error.message}` },
        { status: 500 }
      );
    }

    if (!tables || tables.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No active tables found'
      });
    }

    // Generate QR codes for each table
    const qrCodes = await Promise.all(
      tables.map(async (table) => {
        try {
          const qrURL = await generateQRCodeURL(
            table.id,
            table.restaurant_id,
            table.table_number,
            { size: 256, margin: 2, color: { dark: '#00d9ff', light: '#FFFFFF' } }
          );
          
          const qrSVG = await generateQRCodeSVG(
            table.id,
            table.restaurant_id,
            table.table_number,
            { size: 256, margin: 2, color: { dark: '#00d9ff', light: '#FFFFFF' } }
          );

          return {
            tableId: table.id,
            tableNumber: table.table_number,
            restaurantId: table.restaurant_id,
            qrCodeDataURL: qrURL,
            qrCodeSVG: qrSVG,
            scanURL: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/scan/${table.id}`
          };
        } catch (error) {
          console.error(`Error generating QR code for table ${table.table_number}:`, error);
          return {
            tableId: table.id,
            tableNumber: table.table_number,
            restaurantId: table.restaurant_id,
            error: 'Failed to generate QR code'
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: qrCodes,
      count: qrCodes.length
    });
    
  } catch (error) {
    console.error('🔍 API: QR codes generation exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/qr-codes
 * Generate QR code for a specific table and update database
 */
export async function POST(request: NextRequest) {
  try {
    const { tableId } = await request.json();
    
    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    // Get table information
    const { data: table, error: tableError } = await supabaseServer
      .from('tables')
      .select('id, table_number, restaurant_id')
      .eq('id', tableId)
      .single();
    
    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // Generate QR code
    const qrURL = await generateQRCodeURL(
      table.id,
      table.restaurant_id,
      table.table_number,
      { size: 256, margin: 2, color: { dark: '#00d9ff', light: '#FFFFFF' } }
    );

    // Update table with QR code URL
    const { error: updateError } = await supabaseServer
      .from('tables')
      .update({ qr_code_url: qrURL })
      .eq('id', tableId);

    if (updateError) {
      console.error('❌ Failed to update table with QR code URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to save QR code URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tableId: table.id,
        tableNumber: table.table_number,
        qrCodeDataURL: qrURL,
        scanURL: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/scan/${table.id}`
      }
    });
    
  } catch (error) {
    console.error('🔍 API: QR code generation exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
