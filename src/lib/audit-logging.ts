import { supabaseServer } from '@/lib/supabaseServer';

export interface AuditLogEntry {
  session_id?: string;
  action: AuditAction;
  details: Record<string, unknown>;
  performed_by: string;
  ip_address?: string;
  user_agent?: string;
}

export type AuditAction = 
  | 'manager_bill_adjustment'
  | 'table_transfer'
  | 'staff_login'
  | 'staff_logout'
  | 'pin_generation'
  | 'order_status_change'
  | 'payment_processing'
  | 'session_creation'
  | 'session_completion'
  | 'system_configuration_change'
  | 'dashboard_access'
  | 'dashboard_refresh'
  | 'dashboard_settings_update'
  | 'settings_access'
  | 'audit_log_export';

/**
 * Create an immutable audit log entry
 * This function ensures all critical operations are logged for compliance and security
 */
export async function createAuditLog(
  entry: AuditLogEntry,
  request?: Request
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract IP address and user agent from request if available
    const ip_address = request?.headers.get('x-forwarded-for') || 
                      request?.headers.get('x-real-ip') || 
                      'unknown';
    const user_agent = request?.headers.get('user-agent') || 'unknown';

    const auditData = {
      session_id: entry.session_id || null,
      action: entry.action,
      details: entry.details,
      performed_by: entry.performed_by,
      ip_address: ip_address !== 'unknown' ? ip_address : null,
      user_agent: user_agent !== 'unknown' ? user_agent : null
    };

    const { error } = await supabaseServer
      .from('audit_logs')
      .insert(auditData);

    if (error) {
      console.error('❌ Failed to create audit log:', error);
      return { success: false, error: error.message };
    }

    // Audit log created successfully

    return { success: true };

  } catch (error) {
    console.error('❌ Audit logging exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Log manager bill adjustment
 */
export async function logManagerBillAdjustment(
  sessionId: string,
  details: {
    voids?: string[];
    discount?: { amount: number; type: 'fixed' | 'percentage' };
    table_number?: string;
    original_total?: number;
    new_total?: number;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    session_id: sessionId,
    action: 'manager_bill_adjustment',
    details: {
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: 'manager_override'
  }, request);
}

/**
 * Log table transfer
 */
export async function logTableTransfer(
  sessionId: string,
  details: {
    source_table: string;
    destination_table: string;
    transferred_by?: string;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    session_id: sessionId,
    action: 'table_transfer',
    details: {
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: details.transferred_by || 'system'
  }, request);
}

/**
 * Log staff login
 */
export async function logStaffLogin(
  staffId: string,
  details: {
    staff_name?: string;
    device_id?: string;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    action: 'staff_login',
    details: {
      staff_id: staffId,
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: staffId
  }, request);
}

/**
 * Log staff logout
 */
export async function logStaffLogout(
  staffId: string,
  details: {
    staff_name?: string;
    session_duration?: number;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    action: 'staff_logout',
    details: {
      staff_id: staffId,
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: staffId
  }, request);
}

/**
 * Log PIN generation
 */
export async function logPinGeneration(
  sessionId: string,
  details: {
    table_number: string;
    pin: string;
    generated_by: string;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    session_id: sessionId,
    action: 'pin_generation',
    details: {
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: details.generated_by
  }, request);
}

/**
 * Log order status change
 */
export async function logOrderStatusChange(
  sessionId: string,
  details: {
    order_id: string;
    menu_item_name: string;
    old_status: string;
    new_status: string;
    changed_by?: string;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    session_id: sessionId,
    action: 'order_status_change',
    details: {
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: details.changed_by || 'system'
  }, request);
}

/**
 * Log payment processing
 */
export async function logPaymentProcessing(
  sessionId: string,
  details: {
    amount: number;
    payment_method: string;
    transaction_id?: string;
    status: 'success' | 'failed' | 'pending';
    processed_by?: string;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    session_id: sessionId,
    action: 'payment_processing',
    details: {
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: details.processed_by || 'system'
  }, request);
}

/**
 * Log session creation
 */
export async function logSessionCreation(
  sessionId: string,
  details: {
    table_number: string;
    started_by: string;
    served_by?: string;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    session_id: sessionId,
    action: 'session_creation',
    details: {
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: details.started_by
  }, request);
}

/**
 * Log session completion
 */
export async function logSessionCompletion(
  sessionId: string,
  details: {
    table_number: string;
    total_amount: number;
    completed_by?: string;
    duration_minutes?: number;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    session_id: sessionId,
    action: 'session_completion',
    details: {
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: details.completed_by || 'system'
  }, request);
}

/**
 * Log system configuration changes
 */
export async function logSystemConfigurationChange(
  details: {
    configuration_type: string;
    old_value?: unknown;
    new_value: unknown;
    changed_by: string;
  },
  request?: Request
): Promise<void> {
  await createAuditLog({
    action: 'system_configuration_change',
    details: {
      ...details,
      timestamp: new Date().toISOString()
    },
    performed_by: details.changed_by
  }, request);
}
