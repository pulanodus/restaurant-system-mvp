'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, CreditCard, RefreshCw, Eye } from 'lucide-react';

interface PaymentNotification {
  id: string;
  session_id: string;
  table_number: string;
  subtotal: number;
  vat_amount: number;
  tip_amount: number;
  final_total: number;
  notification_type: string;
  payment_type?: string; // 'individual' or 'table'
  status: 'pending' | 'acknowledged' | 'completed' | 'dismissed';
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  completed_at?: string;
  completed_by?: string;
}

export default function StaffPaymentsPage() {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<PaymentNotification | null>(null);

  // Load payment notifications
  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/staff/payment-notifications', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to load payment notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError(error instanceof Error ? error.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Acknowledge notification
  const acknowledgeNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/staff/payment-notifications/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          acknowledgedBy: 'Staff Member' // In real app, get from auth
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to acknowledge notification:', errorData);
        throw new Error(errorData.error || `Failed to acknowledge notification (${response.status})`);
      }

      // Reload notifications
      await loadNotifications();
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      setError(error instanceof Error ? error.message : 'Failed to acknowledge notification');
    }
  };

  // Complete payment
  const completePayment = async (sessionId: string, paymentMethod: string) => {
    try {
      const response = await fetch('/api/payment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          paymentMethod,
          completedBy: 'Staff Member' // In real app, get from auth
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Payment completion failed:', errorData);
        throw new Error(errorData.error || `Failed to complete payment (${response.status})`);
      }

      // Reload notifications
      await loadNotifications();
      setSelectedNotification(null);
    } catch (error) {
      console.error('Error completing payment:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete payment');
    }
  };

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'acknowledged':
        return 'text-blue-600 bg-blue-100';
      case 'dismissed':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-orange-600 bg-orange-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'acknowledged':
        return <Eye className="w-4 h-4" />;
      case 'dismissed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#00d9ff] rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Notifications</h1>
                <p className="text-gray-600">Manage customer payment requests</p>
              </div>
            </div>
            <button
              onClick={loadNotifications}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh notifications"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 text-red-600 mt-0.5">⚠️</div>
              <div>
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(notification.status)}`}>
                        {getStatusIcon(notification.status)}
                        <span className="capitalize">{notification.status}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Table {notification.table_number}</h3>
                        <p className="text-sm text-gray-600">Session: {notification.session_id.slice(-8)}</p>
                        {notification.payment_type && (
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                            notification.payment_type === 'table' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {notification.payment_type === 'table' ? 'Table Payment' : 'Individual Payment'}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Payment Breakdown</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Subtotal: {formatCurrency(notification.subtotal)}</div>
                          <div>VAT: {formatCurrency(notification.vat_amount)}</div>
                          <div>Tip: {formatCurrency(notification.tip_amount)}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Total Amount</h4>
                        <div className="text-2xl font-bold text-[#00d9ff]">
                          {formatCurrency(notification.final_total)}
                        </div>
                      </div>
                    </div>

                    {notification.acknowledged_at && (
                      <div className="text-sm text-gray-600 mb-2">
                        Acknowledged by {notification.acknowledged_by} at {formatDate(notification.acknowledged_at)}
                      </div>
                    )}

                    {notification.completed_at && (
                      <div className="text-sm text-gray-600">
                        Completed by {notification.completed_by} at {formatDate(notification.completed_at)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    {notification.status === 'pending' && (
                      <>
                        <button
                          onClick={() => acknowledgeNotification(notification.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => setSelectedNotification(notification)}
                          className="px-4 py-2 bg-[#00d9ff] text-white rounded-lg hover:bg-[#00c4e6] transition-colors text-sm font-medium"
                        >
                          Complete Payment
                        </button>
                      </>
                    )}
                    
                    {notification.status === 'acknowledged' && (
                      <button
                        onClick={() => setSelectedNotification(notification)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Complete Payment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment Notifications</h3>
              <p className="text-gray-600">No payment requests are currently pending.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Completion Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Payment</h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">Table {selectedNotification.table_number}</p>
              <p className="text-2xl font-bold text-[#00d9ff]">
                {formatCurrency(selectedNotification.final_total)}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => completePayment(selectedNotification.session_id, 'cash')}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Cash Payment
              </button>
              <button
                onClick={() => completePayment(selectedNotification.session_id, 'card')}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Card Payment
              </button>
              <button
                onClick={() => completePayment(selectedNotification.session_id, 'qr_code')}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                QR Code Payment
              </button>
            </div>

            <button
              onClick={() => setSelectedNotification(null)}
              className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
