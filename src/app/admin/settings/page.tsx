'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/error-handling';
import { 
  Save, 
  Shield, 
  CreditCard, 
  Clock,
  Bell,
  Database,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

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

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // In a real app, this would fetch from a restaurant_settings table
      // For now, we'll use localStorage as a simple storage solution
      const savedSettings = localStorage.getItem('restaurant_settings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveStatus('idle');

      // In a real app, this would save to a restaurant_settings table
      localStorage.setItem('restaurant_settings', JSON.stringify(settings));
      
      // Log the configuration change to audit log
      await supabase.from('audit_logs').insert({
        action: 'system_configuration_change',
        details: {
          changes: settings,
          changed_by: 'admin'
        },
        performed_by: 'admin'
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (key: keyof RestaurantSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Configuration Settings</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration Settings</h1>
          <p className="text-gray-600">Manage your restaurant's operational settings</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            isSaving
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Save Status */}
      {saveStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800">Settings saved successfully!</span>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">Failed to save settings. Please try again.</span>
        </div>
      )}

      {/* Payment Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-6">
          <CreditCard className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Payment Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Payment Finalization Method */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Payment Finalization Method
            </h3>
            <p className="text-gray-600 mb-6">
              Choose how payments are finalized in your restaurant. This affects the customer experience and operational flow.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  id="attendant_verified"
                  type="radio"
                  name="payment_method"
                  value="attendant_verified"
                  checked={settings.payment_finalization_method === 'attendant_verified'}
                  onChange={(e) => handleSettingChange('payment_finalization_method', e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3">
                  <label htmlFor="attendant_verified" className="text-sm font-medium text-gray-900">
                    Attendant-Verified (Default)
                  </label>
                  <p className="text-sm text-gray-600">
                    Staff must verify and approve all payments before finalization. 
                    Provides maximum control and security but requires staff presence.
                  </p>
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <Shield className="h-3 w-3 mr-1" />
                    <span>High Security</span>
                    <Clock className="h-3 w-3 ml-3 mr-1" />
                    <span>Staff Required</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <input
                  id="self_serve"
                  type="radio"
                  name="payment_method"
                  value="self_serve"
                  checked={settings.payment_finalization_method === 'self_serve'}
                  onChange={(e) => handleSettingChange('payment_finalization_method', e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3">
                  <label htmlFor="self_serve" className="text-sm font-medium text-gray-900">
                    Self-Serve (High-Trust)
                  </label>
                  <p className="text-sm text-gray-600">
                    Customers can finalize payments independently. 
                    Faster service but requires trust in customer honesty.
                  </p>
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <Shield className="h-3 w-3 mr-1" />
                    <span>Medium Security</span>
                    <Clock className="h-3 w-3 ml-3 mr-1" />
                    <span>Self-Service</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Service Charges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={settings.tax_rate * 100}
                onChange={(e) => handleSettingChange('tax_rate', parseFloat(e.target.value) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Charge Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={settings.service_charge_rate * 100}
                onChange={(e) => handleSettingChange('service_charge_rate', parseFloat(e.target.value) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Session Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-6">
          <Clock className="h-6 w-6 text-green-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Session Settings</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Auto-close Sessions</h3>
              <p className="text-sm text-gray-600">Automatically close sessions after payment completion</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_close_sessions}
                onChange={(e) => handleSettingChange('auto_close_sessions', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              min="30"
              max="480"
              value={settings.session_timeout_minutes}
              onChange={(e) => handleSettingChange('session_timeout_minutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Sessions will auto-close after this duration of inactivity</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Require Table PINs</h3>
              <p className="text-sm text-gray-600">Require PIN entry for table access</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_table_pins}
                onChange={(e) => handleSettingChange('require_table_pins', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-6">
          <Bell className="h-6 w-6 text-yellow-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Enable Notifications</h3>
              <p className="text-sm text-gray-600">Receive notifications for orders, payments, and system events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_notifications}
                onChange={(e) => handleSettingChange('enable_notifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Low Stock Threshold
            </label>
            <input
              type="number"
              min="1"
              value={settings.low_stock_threshold}
              onChange={(e) => handleSettingChange('low_stock_threshold', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Get notified when menu item availability drops below this number</p>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-6">
          <Database className="h-6 w-6 text-gray-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">System Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="font-medium text-gray-700">Version:</span>
            <span className="ml-2 text-gray-600">1.0.0</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <span className="ml-2 text-gray-600">{new Date().toLocaleDateString()}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Database:</span>
            <span className="ml-2 text-gray-600">Supabase</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Environment:</span>
            <span className="ml-2 text-gray-600">Production</span>
          </div>
        </div>
      </div>
    </div>
  );
}
