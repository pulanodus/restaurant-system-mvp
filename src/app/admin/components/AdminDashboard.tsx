'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  DollarSign, 
  Users, 
  Clock, 
  Star,
  ChefHat,
  Activity,
  AlertCircle,
  CheckCircle,
  Timer,
  RotateCcw,
  Power,
  BarChart3,
  TrendingUp,
  Calendar,
  Shield
} from 'lucide-react';

interface TableStatus {
  id: string;
  tableNumber: string;
  status: 'available' | 'occupied' | 'payment_pending';
  orderValue?: number;
  diners?: number;
  sessionId?: string;
}

interface TodayMetrics {
  todaysSales: number;
  customersServed: number;
  currentCovers: number;
  averageRating: number;
  activeSessions: number;
  totalTables: number;
}

export default function AdminDashboard() {
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [metrics, setMetrics] = useState<TodayMetrics>({
    todaysSales: 0,
    customersServed: 0,
    currentCovers: 0,
    averageRating: 4.2,
    activeSessions: 0,
    totalTables: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResettingUser, setIsResettingUser] = useState(false);
  const [userResetMessage, setUserResetMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select(`
          id,
          table_number,
          capacity,
          occupied,
          current_session_id,
          sessions!sessions_table_id_fkey (
            id,
            status,
            started_by_name,
            diners,
            orders (
              id,
              quantity,
              menu_items!inner (
                price
              )
            )
          )
        `)
        .eq('is_active', true)
        .order('table_number');

      if (tablesError) {
        console.error('Error fetching tables:', tablesError);
        return;
      }

      // Process tables data
      const processedTables = tablesData?.map(table => {
        const session = Array.isArray(table.sessions) ? table.sessions[0] : table.sessions;
        const orders = session?.orders || [];
        
        // Calculate order value
        const orderValue = orders.reduce((sum: number, order: any) => {
          const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
          return sum + (menuItem?.price || 0) * order.quantity;
        }, 0);

        // Count diners
        const diners = session?.diners ? 
          (Array.isArray(session.diners) ? session.diners.length : 1) : 0;

        let status: 'available' | 'occupied' | 'payment_pending' = 'available';
        if (table.occupied && session?.status === 'active') {
          status = orderValue > 0 ? 'occupied' : 'occupied';
        }

        return {
          id: table.id,
          tableNumber: table.table_number,
          status,
          orderValue,
          diners,
          sessionId: session?.id
        };
      }) || [];

      setTables(processedTables);

      // Calculate metrics
      const todaysSales = processedTables.reduce((sum, table) => sum + (table.orderValue || 0), 0);
      const currentCovers = processedTables.reduce((sum, table) => sum + (table.diners || 0), 0);
      const activeSessions = processedTables.filter(table => table.status === 'occupied').length;
      const totalTables = processedTables.length;

      // Fetch additional metrics from orders
      const today = new Date().toISOString().split('T')[0];
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          quantity,
          menu_items!inner (
            price
          )
        `)
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      const totalSales = ordersData?.reduce((sum, order) => {
        const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
        return sum + (menuItem?.price || 0) * order.quantity;
      }, 0) || 0;

      setMetrics({
        todaysSales: totalSales,
        customersServed: currentCovers,
        currentCovers,
        averageRating: 4.2,
        activeSessions,
        totalTables
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'occupied': return 'bg-blue-100 text-blue-800';
      case 'payment_pending': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />;
      case 'occupied': return <Users className="h-4 w-4" />;
      case 'payment_pending': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  // Daily reset function
  const handleDailyReset = async () => {
    const confirmed = window.confirm(
      '⚠️ DAILY RESET CONFIRMATION ⚠️\n\n' +
      'This will:\n' +
      '• End all active sessions\n' +
      '• Mark all tables as available\n' +
      '• Clear old cart items\n' +
      '• Reset daily data\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you sure you want to proceed?'
    );

    if (!confirmed) return;

    setIsResetting(true);
    setResetMessage(null);

    try {
      // Use test endpoint in development, admin endpoint in production
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      const endpoint = isDevelopment ? '/api/test/daily-reset' : '/api/admin/daily-reset';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage(`✅ Daily reset completed successfully! Reset ${data.data.sessions_reset} sessions.`);
        
        // Refresh the dashboard data
        await fetchDashboardData();
        
        // Clear the success message after 5 seconds
        setTimeout(() => {
          setResetMessage(null);
        }, 5000);
      } else {
        setResetMessage(`❌ Daily reset failed: ${data.error}`);
        
        // Clear the error message after 5 seconds
        setTimeout(() => {
          setResetMessage(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Daily reset error:', error);
      setResetMessage('❌ Daily reset failed: Network error');
      
      // Clear the error message after 5 seconds
      setTimeout(() => {
        setResetMessage(null);
      }, 5000);
    } finally {
      setIsResetting(false);
    }
  };

  // Reset specific user status function
  const handleResetUserStatus = async (sessionId: string, userName: string) => {
    const confirmed = window.confirm(
      `⚠️ RESET USER STATUS ⚠️\n\n` +
      `This will reset "${userName}" to inactive status in session ${sessionId}.\n\n` +
      `Are you sure you want to proceed?`
    );

    if (!confirmed) return;

    setIsResettingUser(true);
    setUserResetMessage(null);

    try {
      const response = await fetch('/api/admin/reset-user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, userName }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserResetMessage(`✅ User "${userName}" status reset to inactive successfully!`);
        
        // Refresh the dashboard data
        await fetchDashboardData();
        
        // Clear the success message after 5 seconds
        setTimeout(() => {
          setUserResetMessage(null);
        }, 5000);
      } else {
        setUserResetMessage(`❌ Reset failed: ${data.error}`);
        
        // Clear the error message after 5 seconds
        setTimeout(() => {
          setUserResetMessage(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Reset user status error:', error);
      setUserResetMessage('❌ Reset failed: Network error');
      
      // Clear the error message after 5 seconds
      setTimeout(() => {
        setUserResetMessage(null);
      }, 5000);
    } finally {
      setIsResettingUser(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Restaurant management and operations</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last updated</div>
              <div className="text-sm font-medium text-gray-900">
                {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Reset Section - Prominent placement */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Owner Operations</h2>
            </div>
            
            <div className="space-y-4">
              {/* Reset Message */}
              {resetMessage && (
                <div className={`p-4 rounded-lg text-sm font-medium ${
                  resetMessage.includes('✅') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {resetMessage}
                </div>
              )}
              
              {/* User Reset Message */}
              {userResetMessage && (
                <div className={`p-4 rounded-lg text-sm font-medium ${
                  userResetMessage.includes('✅') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {userResetMessage}
                </div>
              )}
              
              {/* Daily Reset Button */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleDailyReset}
                  disabled={isResetting}
                  className="flex items-center space-x-3 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isResetting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <Power className="h-5 w-5" />
                      <span>End Day & Reset All Sessions</span>
                    </>
                  )}
                </button>
                
                <div className="text-sm text-gray-600">
                  <div className="font-medium">⚠️ Owner Only</div>
                  <div>Use this when closing the restaurant</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.todaysSales)}</div>
                <div className="text-sm text-gray-600">Today's Sales</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{metrics.currentCovers}</div>
                <div className="text-sm text-gray-600">Current Covers</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{metrics.activeSessions}</div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{metrics.totalTables}</div>
                <div className="text-sm text-gray-600">Total Tables</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Table Status</h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tables.map((table) => (
                <div key={table.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Table {table.tableNumber}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(table.status)}`}>
                      {getStatusIcon(table.status)}
                      <span className="ml-1 capitalize">{table.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                  
                  {table.status === 'occupied' && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        {table.diners} diner{table.diners !== 1 ? 's' : ''}
                      </div>
                      {table.orderValue && table.orderValue > 0 && (
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(table.orderValue)}
                        </div>
                      )}
                      <button
                        onClick={() => handleResetUserStatus(table.sessionId || '', 'thatie')}
                        disabled={isResettingUser}
                        className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50"
                      >
                        {isResettingUser ? 'Resetting...' : 'Reset Thatie'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
