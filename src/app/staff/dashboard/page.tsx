'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  RefreshCw, 
  CreditCard, 
  Bell, 
  Monitor,
  Timer,
  HelpCircle,
  AlertCircle,
  Users,
  CheckCircle,
  User,
  Eye,
  EyeOff,
  LogIn,
  LogOut
} from 'lucide-react';
import { useAudioNotification, getNotificationSoundType } from '@/lib/audio-notifications';
import AudioSettings from '@/app/components/AudioSettings';


interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  email?: string;
  role: string;
}

interface Notification {
  id: string;
  type: 'urgent' | 'payment' | 'assistance';
  title: string;
  message: string;
  table_number?: string;
  amount?: number;
  timestamp: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  metadata?: {
    assigned_waitstaff?: string;
    is_my_table?: boolean;
  };
}

interface PaymentNotification {
  id: string;
  session_id: string;
  table_number: string;
  subtotal: number;
  vat_amount: number;
  tip_amount: number;
  final_total: number;
  notification_type: string;
  payment_type?: string;
  status: 'pending' | 'acknowledged' | 'completed' | 'dismissed';
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  completed_at?: string;
  completed_by?: string;
}

interface Table {
  id: string;
  table_number: string;
  occupied: boolean;
  capacity: number;
  current_session_id?: string;
  current_pin?: string;
}

interface Session {
  id: string;
  table_id: string;
  status: string;
  started_by_name?: string;
  served_by?: string; // Staff member ID who serves this table
  created_at: string;
  payment_status?: string;
  final_total?: number;
  diners?: Array<{ id: string; name: string }>;
  orderTotal?: number;
  orderSubtotal?: number;
  orderTax?: number;
  orderItemCount?: number;
  tables?: {
    id: string;
    table_number: string;
    capacity: number;
  };
}

export default function StaffDashboard() {
  const router = useRouter();
  const [paymentNotifications, setPaymentNotifications] = useState<PaymentNotification[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Staff authentication and view toggle
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [showMyTablesOnly, setShowMyTablesOnly] = useState(false);
  const [isStaffLoginOpen, setIsStaffLoginOpen] = useState(false);
  
  // Multi-user tablet mode state
  const [isTabletMode, setIsTabletMode] = useState(false);
  const [allStaffAssignments, setAllStaffAssignments] = useState<Record<string, string>>({});
  const [selectedStaffView, setSelectedStaffView] = useState<string | null>(null);
  
  // Transfer table mode state
  const [isTransferMode, setIsTransferMode] = useState(false);
  const [transferSourceTable, setTransferSourceTable] = useState<Table | null>(null);
  const [transferSourceSession, setTransferSourceSession] = useState<Session | null>(null);
  const [selectedDestinationTable, setSelectedDestinationTable] = useState<string | null>(null);
  
  // Manager override state
  const [isManagerOverrideOpen, setIsManagerOverrideOpen] = useState(false);
  const [managerOverrideTable, setManagerOverrideTable] = useState<Table | null>(null);
  const [managerOverrideSession, setManagerOverrideSession] = useState<Session | null>(null);
  const [managerPin, setManagerPin] = useState('');
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);
  const [selectedItemsToVoid, setSelectedItemsToVoid] = useState<string[]>([]);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [sessionOrders, setSessionOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);
  const { playSound } = useAudioNotification();

  // Load all data
  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      // Load all notifications from the new notification system
      try {
        const notificationsResponse = await fetch('/api/notifications?status=pending');
        const notificationsData = await notificationsResponse.json();
        
        if (notificationsData.success) {
          // Transform database notifications into our notification format
          const transformedNotifications: Notification[] = notificationsData.notifications.map((n: any) => ({
            id: n.id,
            type: n.type === 'kitchen_ready' ? 'urgent' : 
                  n.type === 'payment_request' ? 'payment' : 'assistance',
            title: n.title,
            message: n.message,
            table_number: n.sessions?.tables?.table_number || 'Unknown',
            timestamp: n.created_at,
            status: n.status === 'pending' ? 'pending' as const : 
                    n.status === 'acknowledged' ? 'acknowledged' as const : 'resolved' as const,
            priority: n.priority === 'high' ? 'high' as const : 
                     n.priority === 'medium' ? 'medium' as const : 'low' as const,
            metadata: {
              assigned_waitstaff: n.metadata?.assigned_waitstaff,
              is_my_table: staff ? n.sessions?.served_by === staff.id : false
            }
          }));

          setNotifications(transformedNotifications);
          
          // Play audio notification for new notifications
          const currentNotificationCount = transformedNotifications.filter(n => n.status === 'pending').length;
          if (currentNotificationCount > previousNotificationCount && previousNotificationCount > 0) {
            // New notifications detected - play sound for the most recent one
            const newNotifications = transformedNotifications
              .filter(n => n.status === 'pending')
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, currentNotificationCount - previousNotificationCount);
            
            newNotifications.forEach(notification => {
              const soundType = getNotificationSoundType(
                notification.type === 'urgent' ? 'kitchen_ready' :
                notification.type === 'payment' ? 'payment_request' : 'customer_help'
              );
              playSound(soundType);
            });
          }
          setPreviousNotificationCount(currentNotificationCount);
        } else {
          console.warn('Notifications API not available:', notificationsData.error);
          setNotifications([]);
        }
      } catch (notificationError) {
        console.warn('Notifications system not set up yet:', notificationError);
        setNotifications([]);
      }

      // Also load payment notifications for backward compatibility
      try {
        const paymentResponse = await fetch('/api/staff/payment-notifications');
        const paymentData = await paymentResponse.json();
        setPaymentNotifications(paymentData.notifications || []);
      } catch (paymentError) {
        console.warn('Failed to load payment notifications:', paymentError);
        setPaymentNotifications([]);
      }

                // Load tables and sessions for table management
                try {
                  const tablesResponse = await fetch('/api/tables');
                  const tablesData = await tablesResponse.json();
                  setTables(tablesData.data || []);

                  const sessionsResponse = await fetch('/api/sessions/active-sessions');
                  const sessionsData = await sessionsResponse.json();
                  setSessions(sessionsData.sessions || []);
                } catch (tableError) {
                  console.warn('Failed to load table data:', tableError);
                  setTables([]);
                  setSessions([]);
                }

    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // Silent refresh for auto-updates (no loading spinner)
  const silentRefresh = async () => {
    await loadData(false);
  };

  // Check for existing login and load data on component mount
  useEffect(() => {
    const checkExistingLogin = () => {
      const existingStaff = localStorage.getItem('staff');
      if (existingStaff) {
        try {
          const staff = JSON.parse(existingStaff);
          if (staff && staff.staffId) {
            setStaff(staff);
            console.log('✅ Staff session restored:', staff.name);
          } else {
            // Invalid staff data, redirect to PIN entry
            window.location.href = '/staff/pin-entry';
          }
        } catch (error) {
          console.error('Error parsing existing staff data:', error);
          localStorage.removeItem('staff');
          window.location.href = '/staff/pin-entry';
        }
      } else {
        // No existing login, redirect to PIN entry
        window.location.href = '/staff/pin-entry';
      }
    };

    checkExistingLogin();
    loadData();
  }, []);

  // Auto-refresh every 30 seconds (silent - no loading spinner)
  useEffect(() => {
    const interval = setInterval(silentRefresh, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load staff assignments when tablet mode is enabled
  useEffect(() => {
    if (isTabletMode) {
      loadAllStaffAssignments();
    }
  }, [isTabletMode]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return time.toLocaleDateString();
  };


  // Get notification icon and color
  const getNotificationStyle = (notification: Notification) => {
    switch (notification.type) {
      case 'urgent':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          bgColor: 'bg-red-50 border-red-200',
          iconColor: 'text-red-600',
          badgeColor: 'bg-red-100 text-red-800'
        };
      case 'payment':
        return {
          icon: <CreditCard className="w-5 h-5" />,
          bgColor: 'bg-pink-50 border-pink-200',
          iconColor: 'text-pink-600',
          badgeColor: 'bg-pink-100 text-pink-800'
        };
      case 'assistance':
        return {
          icon: <HelpCircle className="w-5 h-5" />,
          bgColor: 'bg-blue-50 border-blue-200',
          iconColor: 'text-blue-600',
          badgeColor: 'bg-blue-100 text-blue-800'
        };
      default:
        return {
          icon: <Bell className="w-5 h-5" />,
          bgColor: 'bg-gray-50 border-gray-200',
          iconColor: 'text-gray-600',
          badgeColor: 'bg-gray-100 text-gray-800'
        };
    }
  };

  // Handle notification resolve
  const handleNotificationAction = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resolve',
          staff_member: 'Staff Member' // You can get this from auth context
        }),
      });

      if (response.ok) {
        // Update local state - remove the resolved notification
        setNotifications(prev => 
          prev.filter(n => n.id !== notificationId)
        );
        console.log('✅ Notification resolved successfully');
      } else {
        console.error('Failed to resolve notification');
      }
    } catch (error) {
      console.error('Error resolving notification:', error);
    }
  };

  // Staff authentication functions
  const handleStaffLogin = async (staffId: string, deviceId?: string) => {
    try {
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId: staffId.trim(),
          deviceId: deviceId?.trim() || null
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store staff data in localStorage
        localStorage.setItem('staff', JSON.stringify(data.staff));
        setStaff(data.staff);
        setIsStaffLoginOpen(false);
        console.log('✅ Staff logged in successfully:', data.staff.name);
      } else {
        console.error('❌ Staff login failed:', data.error);
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Staff login error:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleStaffLogout = () => {
    // Clear localStorage
    localStorage.removeItem('staff');
    
    // Clear all state
    setStaff(null);
    setShowMyTablesOnly(false);
    setIsTabletMode(false);
    setSelectedStaffView(null);
    setAllStaffAssignments({});
    console.log('👋 Staff logged out');
    
    // Redirect to PIN entry page
    window.location.href = '/staff/pin-entry';
  };

  const handleClaimTable = async (sessionId: string) => {
    if (!staff) return;
    
    try {
      const response = await fetch('/api/sessions/assign-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          staffId: staff.id
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Table claimed successfully:', data.message);
        // Refresh data to show updated assignment
        await loadData(false);
      } else {
        console.error('❌ Failed to claim table:', data.error);
        alert(data.error || 'Failed to claim table');
      }
    } catch (error) {
      console.error('❌ Error claiming table:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleGeneratePin = async (tableId: string) => {
    if (!staff) return;
    
    try {
      const response = await fetch('/api/tables/generate-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableId,
          staffId: staff.id
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ PIN generated successfully:', data.message);
        // Show success message with PIN
        alert(`PIN ${data.pin} generated for Table ${data.table.table_number}!\n\nYou are now assigned to this table.`);
        // Refresh data to show updated status
        await loadData(false);
        if (isTabletMode) {
          await loadAllStaffAssignments();
        }
      } else {
        console.error('❌ Failed to generate PIN:', data.error);
        alert(data.error || 'Failed to generate PIN');
      }
    } catch (error) {
      console.error('❌ Error generating PIN:', error);
      alert('Network error. Please try again.');
    }
  };

  // Load all staff assignments for tablet mode
  const loadAllStaffAssignments = async () => {
    try {
      const response = await fetch('/api/staff/all-assignments');
      const data = await response.json();
      if (data.success) {
        setAllStaffAssignments(data.assignments);
      }
    } catch (error) {
      console.error('Failed to load staff assignments:', error);
    }
  };

  // Switch staff view in tablet mode
  const switchStaffView = (staffId: string) => {
    if (staffId === 'all') {
      setSelectedStaffView(null);
      setShowMyTablesOnly(false);
    } else {
      setSelectedStaffView(staffId);
      setShowMyTablesOnly(true);
    }
  };

  // Transfer table functions
  const initiateTransfer = (table: Table, session: Session) => {
    console.log('initiateTransfer called with:', { table: table.table_number, session: session.id });
    setTransferSourceTable(table);
    setTransferSourceSession(session);
    setSelectedDestinationTable(null);
    setIsTransferMode(true);
    console.log('Transfer mode state set to true');
  };

  const cancelTransfer = () => {
    setIsTransferMode(false);
    setTransferSourceTable(null);
    setTransferSourceSession(null);
    setSelectedDestinationTable(null);
  };

  const confirmTransfer = async () => {
    if (!transferSourceTable || !transferSourceSession || !selectedDestinationTable) {
      alert('Please select a destination table');
      return;
    }

    try {
      const response = await fetch('/api/tables/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTableId: transferSourceTable.id,
          destinationTableId: selectedDestinationTable,
          sessionId: transferSourceSession.id
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        console.log('✅ Table transfer successful:', data.message);
        alert('Table Transferred!');
        await loadData(false);
        cancelTransfer();
      } else {
        console.error('❌ Failed to transfer table:', data.error);
        alert(data.error || 'Failed to transfer table');
      }
    } catch (error) {
      console.error('❌ Error transferring table:', error);
      alert('Network error. Please try again.');
    }
  };

  // Get available tables for transfer (excluding source table)
  const getAvailableTablesForTransfer = () => {
    return tables.filter(table => 
      !table.occupied && 
      table.id !== transferSourceTable?.id
    );
  };

  // Manager override functions
  const initiateManagerOverride = async (table: Table, session: Session) => {
    console.log('initiateManagerOverride called with:', { table: table.table_number, session: session.id });
    setManagerOverrideTable(table);
    setManagerOverrideSession(session);
    setManagerPin('');
    setIsManagerAuthenticated(false);
    setSelectedItemsToVoid([]);
    setDiscountEnabled(false);
    setDiscountAmount('');
    setDiscountType('fixed');
    setIsManagerOverrideOpen(true);
    console.log('Manager override modal state set to true');

    // Load session orders
    try {
      const response = await fetch(`/api/sessions/${session.id}/orders`);
      const data = await response.json();
      if (data.success) {
        setSessionOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to load session orders:', error);
    }
  };

  const authenticateManager = async () => {
    if (!managerPin.trim()) {
      alert('Please enter manager PIN');
      return;
    }

    try {
      const response = await fetch('/api/manager/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerPin: managerPin.trim() }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setIsManagerAuthenticated(true);
        console.log('✅ Manager authenticated successfully');
      } else {
        alert(data.error || 'Invalid manager PIN');
        setManagerPin('');
      }
    } catch (error) {
      console.error('❌ Manager authentication error:', error);
      alert('Network error. Please try again.');
    }
  };

  const cancelManagerOverride = () => {
    setIsManagerOverrideOpen(false);
    setManagerOverrideTable(null);
    setManagerOverrideSession(null);
    setManagerPin('');
    setIsManagerAuthenticated(false);
    setSelectedItemsToVoid([]);
    setDiscountEnabled(false);
    setDiscountAmount('');
    setDiscountType('fixed');
    setSessionOrders([]);
  };

  const toggleItemVoid = (orderId: string) => {
    setSelectedItemsToVoid(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const saveManagerAdjustments = async () => {
    if (!managerOverrideSession) return;

    const hasVoids = selectedItemsToVoid.length > 0;
    const hasDiscount = discountEnabled && discountAmount.trim();

    if (!hasVoids && !hasDiscount) {
      alert('Please select items to void or apply a discount');
      return;
    }

    try {
      const response = await fetch('/api/manager/adjust-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: managerOverrideSession.id,
          voids: selectedItemsToVoid,
          discount: discountEnabled ? {
            amount: parseFloat(discountAmount),
            type: discountType
          } : null
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        console.log('✅ Manager adjustments saved successfully');
        alert('Bill adjustments saved successfully!');
        await loadData(false);
        cancelManagerOverride();
      } else {
        alert(data.error || 'Failed to save adjustments');
      }
    } catch (error) {
      console.error('❌ Error saving manager adjustments:', error);
      alert('Network error. Please try again.');
    }
  };

  // Filter notifications based on staff assignment and view toggle
  const getFilteredNotifications = () => {
    if (!staff || !showMyTablesOnly) {
      return notifications; // Show all notifications
    }
    
    // Show only notifications for tables assigned to this staff member
    return notifications.filter(notification => 
      notification.metadata?.is_my_table === true
    );
  };

  const getFilteredSessions = () => {
    if (!staff || !showMyTablesOnly) {
      return sessions; // Show all sessions
    }
    
    // Show only sessions for tables assigned to this staff member
    return sessions.filter(session => 
      session.served_by === staff.id
    );
  };

  // Table management helper functions
  const getTableStatus = (table: Table) => {
    const session = sessions.find(s => s.table_id === table.id);
    const notification = paymentNotifications.find(n => n.table_number === table.table_number);
    
    if (notification && notification.status === 'pending') {
      return { status: 'payment-pending', color: 'bg-orange-100 text-orange-800', icon: <Bell className="w-4 h-4" /> };
    }
    
    if (session && session.status === 'active') {
      return { status: 'occupied', color: 'bg-red-100 text-red-800', icon: <Users className="w-4 h-4" /> };
    }
    
    // Available tables can be set up by staff
    return { status: 'available', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="w-4 h-4" /> };
  };

  const getSessionInfo = (table: Table) => {
    return sessions.find(s => s.table_id === table.id);
  };

  const getPaymentNotification = (table: Table) => {
    return paymentNotifications.find(n => n.table_number === table.table_number);
  };

  const handleTableClick = (table: Table) => {
    const tableStatus = getTableStatus(table);
    const session = getSessionInfo(table);
    
    // Only allow clicking on occupied tables or tables with payment pending
    if (tableStatus.status === 'occupied' || tableStatus.status === 'payment-pending') {
      if (session) {
        router.push(`/staff/session/${session.id}`);
      }
    }
  };

  // Calculate statistics
  const paymentPending = paymentNotifications.filter(n => n.status === 'pending').length;
  const activeNotifications = notifications.filter(n => n.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d9ff] mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#00d9ff] rounded-full flex items-center justify-center">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Restaurant Dashboard</h1>
                <p className="text-gray-600">Real-time floor status and notifications</p>
                
                {/* Tablet Mode Toggle */}
                <button
                  onClick={() => setIsTabletMode(!isTabletMode)}
                  className={`mt-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    isTabletMode 
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isTabletMode ? '📱 Tablet Mode' : '📱 Single User'}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Staff Controls */}
              {staff ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{staff.name}</p>
                      <p className="text-gray-500">{staff.staffId}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleStaffLogout}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsStaffLoginOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Staff Login</span>
                </button>
              )}
              
            <button
              onClick={() => loadData(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}


        {/* Live Notifications Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-[#00d9ff]" />
              Live Notifications
            </h2>
            <div className="flex items-center space-x-3">
              <AudioSettings />
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {getFilteredNotifications().filter(n => n.status === 'pending').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{showMyTablesOnly ? 'No notifications for your tables' : 'No active notifications'}</p>
              </div>
            ) : (
              getFilteredNotifications()
                .filter(n => n.status === 'pending')
                .sort((a, b) => {
                  // Sort by assignment status first, then priority and timestamp
                  const aIsMyTable = a.metadata?.is_my_table === true;
                  const bIsMyTable = b.metadata?.is_my_table === true;
                  
                  if (aIsMyTable !== bIsMyTable) {
                    return aIsMyTable ? -1 : 1; // My tables first
                  }
                  
                  const priorityOrder = { high: 3, medium: 2, low: 1 };
                  if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                  }
                  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                })
                .map((notification) => {
                  const style = getNotificationStyle(notification);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border ${style.bgColor} transition-all duration-200 hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`${style.iconColor} mt-1`}>
                            {style.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-gray-900">{notification.title}</h3>
                              {notification.metadata?.is_my_table && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  MY TABLE
                                </span>
                              )}
                              {notification.metadata?.assigned_waitstaff && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {notification.metadata.assigned_waitstaff}
                                </span>
                              )}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.badgeColor}`}>
                                {notification.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                            {notification.amount && (
                              <p className="text-sm font-semibold text-[#00d9ff]">
                                Amount: {formatCurrency(notification.amount)}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Timer className="w-3 h-3" />
                              <span>{formatTimeAgo(notification.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={() => handleNotificationAction(notification.id)}
                            className="px-4 py-2 bg-[#00d9ff] text-white text-sm rounded-lg hover:bg-[#00c4e6] transition-colors font-medium"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Table Management Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-[#00d9ff]" />
              Table Management
            </h2>
            <div className="flex items-center space-x-3">
              {/* Staff Controls */}
              {staff ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowMyTablesOnly(!showMyTablesOnly)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      showMyTablesOnly 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showMyTablesOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {showMyTablesOnly ? 'My Tables' : 'All Tables'}
                    </span>
                  </button>
                </div>
              ) : null}
              
              {/* Tablet Mode Staff Assignment Controls */}
              {isTabletMode && Object.keys(allStaffAssignments).length > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => switchStaffView('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        !selectedStaffView 
                          ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      All
                    </button>
                    {Object.entries(allStaffAssignments).map(([staffId, staffName]) => (
                      <button
                        key={staffId}
                        onClick={() => switchStaffView(staffId)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedStaffView === staffId 
                            ? 'bg-green-100 text-green-700 border border-green-300' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        {staffName.split(' ')[0]} {/* Show only first name for space */}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Restaurant Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tables</p>
                  <p className="text-2xl font-bold text-gray-900">{tables.length}</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="text-2xl font-bold text-green-600">
                    {tables.filter(t => getTableStatus(t).status === 'available').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Occupied</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {tables.filter(t => getTableStatus(t).status === 'occupied').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Payment Pending</p>
                  <p className="text-2xl font-bold text-red-600">
                    {tables.filter(t => getTableStatus(t).status === 'payment-pending').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
          </div>

              {/* Tables Grid */}
              <div className="space-y-6">

                {/* Filter Status */}
                {(showMyTablesOnly || (isTabletMode && selectedStaffView && selectedStaffView !== 'all')) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-blue-700 font-medium">
                        {showMyTablesOnly && staff ? `Showing only your tables (${staff.name})` : ''}
                        {isTabletMode && selectedStaffView && selectedStaffView !== 'all' ? `Showing tables for ${allStaffAssignments[selectedStaffView] || selectedStaffView}` : ''}
                      </span>
                  </div>
                </div>
                )}

                {/* Tables Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {tables && tables.length > 0 ? (() => {
                    // Apply filtering based on current view
                    let filteredTables = tables;
                    
                    if (showMyTablesOnly && staff) {
                      // Filter to show only tables assigned to current staff
                      filteredTables = tables.filter(table => {
                        const session = getSessionInfo(table);
                        return session && session.served_by === staff.staffId;
                      });
                    }
                    
                    if (isTabletMode && selectedStaffView && selectedStaffView !== 'all') {
                      // Filter to show only tables assigned to selected staff
                      filteredTables = tables.filter(table => {
                        const session = getSessionInfo(table);
                        return session && session.served_by === selectedStaffView;
                      });
                    }
                    
                    return filteredTables.length > 0 ? filteredTables.map((table, index) => {
                    const tableStatus = getTableStatus(table);
                    const session = getSessionInfo(table);
                    const notification = getPaymentNotification(table);
                    
                    // Glassmorphism design with backdrop blur and transparency
                    const glassConfig = {
                      'available': {
                        glass: 'bg-green-500/10 border-green-300/30 backdrop-blur-md',
                        glow: 'shadow-green-200/50',
                        text: 'text-green-800',
                        status: 'bg-green-500/20 text-green-800 border-green-300/40',
                        icon: 'text-green-600'
                      },
                      'occupied': {
                        glass: 'bg-red-500/10 border-red-300/30 backdrop-blur-md',
                        glow: 'shadow-red-200/50',
                        text: 'text-red-800',
                        status: 'bg-red-500/20 text-red-800 border-red-300/40',
                        icon: 'text-red-600'
                      },
                      'payment-pending': {
                        glass: 'bg-amber-500/10 border-amber-300/30 backdrop-blur-md',
                        glow: 'shadow-amber-200/50',
                        text: 'text-amber-800',
                        status: 'bg-amber-500/20 text-amber-800 border-amber-300/40',
                        icon: 'text-amber-600'
                      }
                    };
                    
                    const config = glassConfig[tableStatus.status as keyof typeof glassConfig];
                    
                    return (
                      <div
                        key={`table-${table.id}-${index}`}
                        onClick={() => handleTableClick(table)}
                        className={`
                          ${config.glass}
                          border rounded-2xl shadow-lg ${config.glow}
                          transition-all duration-300 ease-in-out
                          cursor-pointer h-[220px] p-4 relative
                          hover:scale-105 hover:shadow-xl hover:shadow-black/10
                          group overflow-hidden
                        `}
                      >
                        {/* Glass overlay effect */}
                        <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
                          {/* Status icon */}
                          <div className="mb-3">
                            {tableStatus.status === 'available' ? (
                              <CheckCircle className={`w-5 h-5 ${config.icon} drop-shadow-lg`} />
                            ) : tableStatus.status === 'occupied' ? (
                              <Users className={`w-5 h-5 ${config.icon} drop-shadow-lg`} />
                            ) : (
                              <Bell className={`w-5 h-5 ${config.icon} drop-shadow-lg animate-pulse`} />
                            )}
                        </div>
                        
                          {/* Table number */}
                          <h3 className="text-lg font-bold text-gray-900 mb-2 drop-shadow-lg bg-white/50 px-2 py-1 rounded-lg">
                          Table {table.table_number}
                          </h3>
                          
                          {/* Capacity/Guest Count */}
                          <p className="text-sm text-gray-600 mb-2 bg-white/30 px-2 py-1 rounded-full backdrop-blur-sm">
                            {session && session.diners ? 
                              `${session.diners.length} guest${session.diners.length !== 1 ? 's' : ''}` :
                              `${table.capacity} seats`
                            }
                          </p>
                          
                          {/* Status badge */}
                          <div className={`
                            ${config.status}
                            border backdrop-blur-sm
                            px-2 py-1 rounded-full text-sm font-semibold
                            shadow-lg
                          `}>
                            {tableStatus.status === 'available' ? 'Available' :
                             tableStatus.status === 'occupied' ? 'Occupied' :
                             'Payment Pending'}
                        </div>
                        
                          {/* Order Total - Only show for occupied tables with orders */}
                          {session && session.orderTotal && session.orderTotal > 0 && (
                            <div className="mt-2">
                              <div className="bg-white/40 backdrop-blur-sm border border-white/30 rounded px-2 py-1 shadow-lg">
                                <div className="text-center">
                                  <div className="text-sm text-gray-600">Total</div>
                                  <div className="text-sm font-bold text-gray-800">
                                    P{session.orderTotal.toFixed(2)}
                        </div>
                                </div>
                              </div>
                            </div>
                          )}
                  
                          
                          {/* Staff Actions - Show for logged-in staff */}
                          {staff && (
                            <div className="mt-2">
                              {/* For available tables - Generate PIN */}
                              {!session && tableStatus.status === 'available' && (
                                <button
                                  onClick={() => handleGeneratePin(table.id)}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-2 rounded transition-colors"
                                >
                                  Generate PIN & Setup Table
                                </button>
                              )}
                              
                  </div>
                          )}
                          
                </div>
                        
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl pointer-events-none"></div>
                      </div>
                    );
                  }) : (
                      <div className="col-span-full bg-gray-100 border-2 border-gray-300 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                          {showMyTablesOnly ? 'No Tables Assigned to You' : 'No Tables Found'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {showMyTablesOnly 
                            ? 'You don\'t have any tables assigned to you yet' 
                            : 'No tables are currently available in the system'
                          }
                        </p>
                        <div className="text-sm text-gray-500 bg-white/50 px-4 py-2 rounded-lg inline-block">
                          Tables: {tables?.length || 0} • Status: {tables ? 'Loaded' : 'Not loaded'}
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="col-span-full bg-gray-100 border-2 border-gray-300 rounded-xl p-8 text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        No Tables Found
                      </h3>
                      <p className="text-gray-600 mb-4">
                        No tables are currently available in the system
                      </p>
                      <div className="text-sm text-gray-500 bg-white/50 px-4 py-2 rounded-lg inline-block">
                        Tables: {tables?.length || 0} • Status: {tables ? 'Loaded' : 'Not loaded'}
                      </div>
                    </div>
                  )}
                  
                    </div>
                    </div>
                    </div>

        {/* Transfer Table Modal */}
        {isTransferMode && transferSourceTable && transferSourceSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Transfer Table {transferSourceTable.table_number}
                  </h2>
                  <button
                    onClick={cancelTransfer}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                  </div>
                  
                {/* Current Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Current Status:</div>
                    <div>Moving from: <span className="font-semibold">Table {transferSourceTable.table_number}</span></div>
                    <div className="text-xs text-blue-600 mt-1">
                      Current bill: P{transferSourceSession.orderTotal?.toFixed(2) || '0.00'}
                    </div>
                    </div>
                    </div>

                {/* Destination Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select new table:
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {getAvailableTablesForTransfer().map((table) => (
                      <button
                        key={table.id}
                        onClick={() => setSelectedDestinationTable(table.id)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          selectedDestinationTable === table.id
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-sm font-medium">{table.table_number}</div>
                        <div className="text-xs text-gray-500">{table.capacity} seats</div>
                      </button>
                    ))}
                  </div>
                  {getAvailableTablesForTransfer().length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No available tables for transfer
                </div>
                  )}
                </div>

                {/* Confirmation Message */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium mb-1">⚠️ Important:</div>
                    <div>This will move all orders and the current bill to the new table. Customers must scan the QR code at the new table to continue.</div>
          </div>
        </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={cancelTransfer}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmTransfer}
                    disabled={!selectedDestinationTable}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      selectedDestinationTable
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Confirm Transfer
                  </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Manager Override Modal */}
        {isManagerOverrideOpen && managerOverrideTable && managerOverrideSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {!isManagerAuthenticated ? 'Manager Approval Required' : `Adjust Bill for Table ${managerOverrideTable.table_number}`}
                  </h2>
                  <button
                    onClick={cancelManagerOverride}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {!isManagerAuthenticated ? (
                  /* Step 1: Manager Authentication */
                  <div className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-sm text-red-800">
                        <div className="font-medium mb-1">🔒 Manager Override Required</div>
                        <div>This action requires manager authorization to modify bill amounts.</div>
                      </div>
                    </div>

              <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manager PIN
                      </label>
                      <input
                        type="password"
                        value={managerPin}
                        onChange={(e) => setManagerPin(e.target.value)}
                        placeholder="Enter manager PIN"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                        onKeyPress={(e) => e.key === 'Enter' && authenticateManager()}
                      />
              </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={cancelManagerOverride}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={authenticateManager}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Authenticate
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Step 2: Adjustment Options */
                  <div className="space-y-6">
                    {/* Current Bill Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm text-blue-800">
                        <div className="font-medium mb-1">Current Bill Summary:</div>
                        <div>Total: <span className="font-semibold">P{managerOverrideSession.orderTotal?.toFixed(2) || '0.00'}</span></div>
                        <div className="text-xs text-blue-600 mt-1">
                          {sessionOrders.length} item{sessionOrders.length !== 1 ? 's' : ''} ordered
              </div>
            </div>
          </div>
          
                    {/* Items to Void */}
              <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Items to Void</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {sessionOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedItemsToVoid.includes(order.id)}
                                onChange={() => toggleItemVoid(order.id)}
                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {order.menu_items?.name || 'Unknown Item'}
              </div>
                                <div className="text-xs text-gray-500">
                                  Qty: {order.quantity} • P{(order.menu_items?.price * order.quantity).toFixed(2)}
              </div>
            </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {order.status}
                            </div>
                          </div>
                        ))}
          </div>
        </div>

                    {/* Discount Options */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Discount Options</h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={discountEnabled}
                            onChange={(e) => setDiscountEnabled(e.target.checked)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <label className="text-sm font-medium text-gray-700">Apply Discount</label>
                        </div>

                        {discountEnabled && (
                          <div className="pl-7 space-y-3">
                            <div className="flex items-center space-x-4">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  checked={discountType === 'fixed'}
                                  onChange={() => setDiscountType('fixed')}
                                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="text-sm text-gray-700">Fixed Amount (P)</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  checked={discountType === 'percentage'}
                                  onChange={() => setDiscountType('percentage')}
                                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="text-sm text-gray-700">Percentage (%)</span>
                              </label>
                            </div>
                            <input
                              type="number"
                              value={discountAmount}
                              onChange={(e) => setDiscountAmount(e.target.value)}
                              placeholder={discountType === 'fixed' ? 'Enter amount in P' : 'Enter percentage'}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button
                        onClick={cancelManagerOverride}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveManagerAdjustments}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Save Adjustments
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Staff Login Modal */}
        {isStaffLoginOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-blue-600" />
              </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Login</h2>
                <p className="text-gray-600">Enter your Staff ID to access personalized features</p>
          </div>
          
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const staffId = formData.get('staffId') as string;
                const deviceId = formData.get('deviceId') as string;
                handleStaffLogin(staffId, deviceId);
              }} className="space-y-6">
              <div>
                  <label htmlFor="staffId" className="block text-sm font-medium text-gray-700 mb-2">
                    Staff ID
                  </label>
                  <input
                    type="text"
                    name="staffId"
                    placeholder="e.g., STAFF001, W001, EMP-2024-003, 12345, THABO.M"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900"
                    required
                  />
              </div>

                <div>
                  <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-2">
                    Device ID (Optional)
                  </label>
                  <input
                    type="text"
                    name="deviceId"
                    placeholder="e.g., iPhone-123, Tablet-456"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Helps track which device you're using
                  </p>
              </div>
          
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsStaffLoginOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Login
                  </button>
            </div>
              </form>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Sample Staff IDs (Any Format Works):</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>STAFF001</strong> - Thabo Mthembu (Waiter)</p>
                  <p><strong>W001</strong> - Sarah Johnson (Waiter)</p>
                  <p><strong>EMP-2024-003</strong> - Mike Chen (Waiter)</p>
                  <p><strong>MGR001</strong> - Lisa Rodriguez (Manager)</p>
                  <p><strong>12345</strong> - Admin User (Admin)</p>
                  <p><strong>THABO.M</strong> - Thabo Mthembu (Personal ID)</p>
                  <p><strong>SARAH-J</strong> - Sarah Johnson (Name-based)</p>
          </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 <strong>Tip:</strong> Use your restaurant's existing staff ID system!
                </p>
        </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
