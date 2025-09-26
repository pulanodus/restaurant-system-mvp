import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { supabaseServer } from '@/lib/supabaseServer';

// GET /api/admin/audit-logs - Fetch audit logs with filtering
export const GET = withAdminAuth(async (request: NextRequest, user) => {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const action = url.searchParams.get('action');
    const performedBy = url.searchParams.get('performed_by');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const search = url.searchParams.get('search');

    // Build query
    let query = supabaseServer
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    if (performedBy && performedBy !== 'all') {
      query = query.eq('performed_by', performedBy);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (search) {
      // Search in action, performed_by, and details
      query = query.or(`action.ilike.%${search}%,performed_by.ilike.%${search}%,details.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: auditLogs, error: auditError } = await query;

    if (auditError) {
      throw new Error(`Failed to fetch audit logs: ${auditError.message}`);
    }

    // Get total count for pagination
    let countQuery = supabaseServer
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    // Apply same filters to count query
    if (action && action !== 'all') {
      countQuery = countQuery.eq('action', action);
    }

    if (performedBy && performedBy !== 'all') {
      countQuery = countQuery.eq('performed_by', performedBy);
    }

    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate);
    }

    if (endDate) {
      countQuery = countQuery.lte('created_at', endDate);
    }

    if (search) {
      countQuery = countQuery.or(`action.ilike.%${search}%,performed_by.ilike.%${search}%,details.ilike.%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count audit logs: ${countError.message}`);
    }

    // Get unique actions and users for filter dropdowns
    const { data: uniqueActions, error: actionsError } = await supabaseServer
      .from('audit_logs')
      .select('action')
      .not('action', 'is', null);

    const { data: uniqueUsers, error: usersError } = await supabaseServer
      .from('audit_logs')
      .select('performed_by')
      .not('performed_by', 'is', null);

    if (actionsError || usersError) {
      console.warn('Failed to fetch unique values for filters');
    }

    const responseData = {
      logs: auditLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      filters: {
        actions: [...new Set(uniqueActions?.map(item => item.action) || [])],
        users: [...new Set(uniqueUsers?.map(item => item.performed_by) || [])]
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Audit logs API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit logs'
    }, { status: 500 });
  }
});

// POST /api/admin/audit-logs/export - Export audit logs to CSV
export const POST = withAdminAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { filters } = body;

    // Build query with same filtering logic as GET
    let query = supabaseServer
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters) {
      if (filters.action && filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }

      if (filters.performedBy && filters.performedBy !== 'all') {
        query = query.eq('performed_by', filters.performedBy);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.search) {
        query = query.or(`action.ilike.%${filters.search}%,performed_by.ilike.%${filters.search}%,details.ilike.%${filters.search}%`);
      }
    }

    // Limit export to 10000 records to prevent memory issues
    query = query.limit(10000);

    const { data: auditLogs, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit logs for export: ${error.message}`);
    }

    // Convert to CSV format
    const csvHeaders = [
      'Timestamp',
      'Action',
      'Performed By',
      'Session ID',
      'IP Address',
      'User Agent',
      'Details'
    ];

    const csvRows = (auditLogs || []).map(log => [
      log.created_at,
      log.action,
      log.performed_by,
      log.session_id || '',
      log.ip_address || '',
      log.user_agent || '',
      JSON.stringify(log.details)
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Log export action
    if (user) {
      await supabaseServer.from('audit_logs').insert({
        action: 'audit_log_export',
        details: {
          filters,
          recordCount: auditLogs?.length || 0,
          exportedBy: user.id
        },
        performed_by: user.id
      });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Audit logs export error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export audit logs'
    }, { status: 500 });
  }
});
