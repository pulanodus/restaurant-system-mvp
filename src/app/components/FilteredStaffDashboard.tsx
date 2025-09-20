'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChefHat,
  Timer,
  RefreshCw,
  User,
  Table
} from 'lucide-react';

interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  email?: string;
  role: string;
}

interface Notification {
  id: string;
  session_id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  timestamp: string;
  table_number: string;
  is_assigned: boolean;
  metadata: {
    assigned_waitstaff: string;
    is_my_table: boolean;
  };
}

interface AssignedTable {
  id: string;
  table_number: string;
  table_id: string;
  status: string;
  started_at: string;
  diners: any[];
  order_total: number;
  assigned_staff: StaffMember;
}

interface FilteredStaffDashboardProps {
  staff: StaffMember;
  sessionId: string;
  onLogout: () => void;
}

export default function FilteredStaffDashboard({ 
  staff, 
  sessionId, 
  onLogout 
}: FilteredStaffDashboardProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [assignedTables, setAssignedTables] = useState<AssignedTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    try {
      // Load notifications and assigned tables in parallel
      const [notificationsResponse, tablesResponse] = await Promise.all([
        fetch(`/api/staff/notifications?staffId=${staff.id}&status=pending`),
        fetch(`/api/staff/assigned-tables?staffId=${staff.id}`)
      ]);

      const notificationsData = await notificationsResponse.json();
      const tablesData = await tablesResponse.json();

      if (notificationsData.success) {
        setNotifications(notificationsData.notifications || []);
      }

      if (tablesData.success) {
        setAssignedTables(tablesData.tables || []);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('❌ Failed to load staff data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [staff.id]);

  const handleNotificationAction = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resolve',
          staff_member: staff.name
        }),
      });

      if (response.ok) {
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

  const getNotificationStyle = (notification: Notification) => {
    const isAssigned = notification.is_assigned;
    
    switch (notification.type) {
      case 'kitchen_ready':
        return {
          icon: <ChefHat className="w-5 h-5" />,
          iconColor: isAssigned ? 'text-green-600' : 'text-blue-600',
          badgeColor: isAssigned ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800',
          borderColor: isAssigned ? 'border-green-200' : 'border-blue-200',
          bgColor: isAssigned ? 'bg-green-50' : 'bg-blue-50'
        };
      case 'payment_request':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          iconColor: isAssigned ? 'text-yellow-600' : 'text-orange-600',
          badgeColor: isAssigned ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800',
          borderColor: isAssigned ? 'border-yellow-200' : 'border-orange-200',
          bgColor: isAssigned ? 'bg-yellow-50' : 'bg-orange-50'
        };
      default:
        return {
          icon: <Bell className="w-5 h-5" />,
          iconColor: isAssigned ? 'text-purple-600' : 'text-gray-600',
          badgeColor: isAssigned ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800',
          borderColor: isAssigned ? 'border-purple-200' : 'border-gray-200',
          bgColor: isAssigned ? 'bg-purple-50' : 'bg-gray-50'
        };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const assignedNotifications = notifications.filter(n => n.is_assigned);
  const unassignedNotifications = notifications.filter(n => !n.is_assigned);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Welcome, {staff.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)} • {staff.staffId}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => loadData()}
                disabled={isLoading}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Table className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Tables</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {assignedTables.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Notifications</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {assignedNotifications.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Other Notifications</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {unassignedNotifications.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatTimeAgo(lastRefresh.toISOString())}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Assigned Tables */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Table className="w-5 h-5 text-green-600 mr-2" />
                My Assigned Tables ({assignedTables.length})
              </h2>
            </div>
            <div className="p-6">
              {assignedTables.length === 0 ? (
                <div className="text-center py-8">
                  <Table className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No tables assigned to you yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Ask a manager to assign tables to you
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedTables.map((table) => (
                    <div key={table.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">
                          Table {table.table_number}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          {table.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Guests: {table.diners.length}</p>
                        <p>Order Total: {formatCurrency(table.order_total)}</p>
                        <p>Started: {formatTimeAgo(table.started_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Bell className="w-5 h-5 text-blue-600 mr-2" />
                Live Notifications ({notifications.length})
              </h2>
            </div>
            <div className="p-6">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending notifications</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* My Assigned Notifications First */}
                  {assignedNotifications.map((notification) => {
                    const style = getNotificationStyle(notification);
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border-2 ${style.borderColor} ${style.bgColor} transition-colors`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`${style.iconColor} mt-1`}>
                            {style.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-gray-900">{notification.title}</h3>
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                MY TABLE
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.badgeColor}`}>
                                {notification.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Timer className="w-3 h-3" />
                                <span>{formatTimeAgo(notification.timestamp)}</span>
                              </div>
                              <button
                                onClick={() => handleNotificationAction(notification.id)}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                              >
                                Resolve
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Other Notifications */}
                  {unassignedNotifications.map((notification) => {
                    const style = getNotificationStyle(notification);
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border ${style.borderColor} ${style.bgColor} transition-colors opacity-75`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`${style.iconColor} mt-1`}>
                            {style.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-gray-900">{notification.title}</h3>
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                OTHER
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.badgeColor}`}>
                                {notification.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Timer className="w-3 h-3" />
                                <span>{formatTimeAgo(notification.timestamp)}</span>
                              </div>
                              <button
                                onClick={() => handleNotificationAction(notification.id)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                              >
                                Help Out
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
