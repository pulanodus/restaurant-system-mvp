import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { supabaseServer } from '@/lib/supabaseServer';
import { createAuditLog } from '@/lib/audit-logging';

interface RestaurantSettings {
  payment_finalization_method: 'attendant_verified' | 'self_serve';
  auto_close_sessions: boolean;
  session_timeout_minutes: number;
  require_table_pins: boolean;
  enable_notifications: boolean;
  low_stock_threshold: number;
  tax_rate: number;
  service_charge_rate: number;
}

// GET /api/admin/settings - Fetch restaurant settings
export const GET = withAdminAuth(async (request: NextRequest, user) => {
  try {
    // In a real app, this would fetch from a restaurant_settings table
    // For now, we'll return default settings with any stored overrides
    
    const defaultSettings: RestaurantSettings = {
      payment_finalization_method: 'attendant_verified',
      auto_close_sessions: false,
      session_timeout_minutes: 120,
      require_table_pins: true,
      enable_notifications: true,
      low_stock_threshold: 10,
      tax_rate: 0.08,
      service_charge_rate: 0.15
    };

    // Try to fetch stored settings (this would be from a real settings table)
    // For now, return defaults
    const settings = defaultSettings;

    // Log settings access
    await createAuditLog({
      action: 'settings_access',
      details: { accessedBy: user.id },
      performed_by: user.id
    });

    return NextResponse.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Settings GET API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch settings'
    }, { status: 500 });
  }
});

// POST /api/admin/settings - Update restaurant settings
export const POST = withAdminAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { settings, changes } = body;

    // Validate settings
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Invalid settings data'
      }, { status: 400 });
    }

    // Validate specific settings
    const validPaymentMethods = ['attendant_verified', 'self_serve'];
    if (settings.payment_finalization_method && !validPaymentMethods.includes(settings.payment_finalization_method)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment finalization method'
      }, { status: 400 });
    }

    if (settings.tax_rate && (settings.tax_rate < 0 || settings.tax_rate > 1)) {
      return NextResponse.json({
        success: false,
        error: 'Tax rate must be between 0 and 1'
      }, { status: 400 });
    }

    if (settings.service_charge_rate && (settings.service_charge_rate < 0 || settings.service_charge_rate > 1)) {
      return NextResponse.json({
        success: false,
        error: 'Service charge rate must be between 0 and 1'
      }, { status: 400 });
    }

    if (settings.session_timeout_minutes && (settings.session_timeout_minutes < 30 || settings.session_timeout_minutes > 480)) {
      return NextResponse.json({
        success: false,
        error: 'Session timeout must be between 30 and 480 minutes'
      }, { status: 400 });
    }

    // In a real app, this would save to a restaurant_settings table
    // For now, we'll just log the changes
    
    // Log settings update
    await createAuditLog({
      action: 'system_configuration_change',
      details: {
        changes,
        newSettings: settings,
        updatedBy: user.id
      },
      performed_by: user.id
    });

    // Here you would typically:
    // 1. Save settings to database
    // 2. Update any cached settings
    // 3. Notify other services of configuration changes
    // 4. Validate that the new settings don't conflict with existing data

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Settings POST API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings'
    }, { status: 500 });
  }
});

// PUT /api/admin/settings - Replace all settings
export const PUT = withAdminAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { settings } = body;

    // Validate complete settings object
    const requiredFields = [
      'payment_finalization_method',
      'auto_close_sessions',
      'session_timeout_minutes',
      'require_table_pins',
      'enable_notifications',
      'low_stock_threshold',
      'tax_rate',
      'service_charge_rate'
    ];

    for (const field of requiredFields) {
      if (!(field in settings)) {
        return NextResponse.json({
          success: false,
          error: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }

    // Log complete settings replacement
    await createAuditLog({
      action: 'system_configuration_change',
      details: {
        action: 'complete_replacement',
        newSettings: settings,
        updatedBy: user.id
      },
      performed_by: user.id
    });

    // In a real app, this would replace all settings in the database

    return NextResponse.json({
      success: true,
      message: 'All settings updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Settings PUT API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings'
    }, { status: 500 });
  }
});

// DELETE /api/admin/settings - Reset to default settings
export const DELETE = withAdminAuth(async (request: NextRequest, user) => {
  try {
    const defaultSettings: RestaurantSettings = {
      payment_finalization_method: 'attendant_verified',
      auto_close_sessions: false,
      session_timeout_minutes: 120,
      require_table_pins: true,
      enable_notifications: true,
      low_stock_threshold: 10,
      tax_rate: 0.08,
      service_charge_rate: 0.15
    };

    // Log settings reset
    await createAuditLog({
      action: 'system_configuration_change',
      details: {
        action: 'reset_to_defaults',
        defaultSettings,
        resetBy: user.id
      },
      performed_by: user.id
    });

    // In a real app, this would reset settings to defaults in the database

    return NextResponse.json({
      success: true,
      message: 'Settings reset to defaults successfully',
      data: defaultSettings
    });

  } catch (error) {
    console.error('Settings DELETE API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset settings'
    }, { status: 500 });
  }
});
