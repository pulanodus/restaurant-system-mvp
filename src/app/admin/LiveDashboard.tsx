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
  Timer
} from 'lucide-react';

interface TableStatus {
  id: string;
  tableNumber: string;
  status: 'available' | 'occupied' | 'payment_pending';
  orderValue?: number;
  diners?: number;
  sessionId?: string;
}

interface KitchenOrder {
  id: string;
  tableNumber: string;
  items: string;
  status: 'preparing' | 'ready' | 'served';
  orderTime: string;
}

interface LiveActivity {
  id: string;
  type: 'order' | 'payment' | 'session';
  description: string;
  timestamp: string;
  amount?: number;
}

interface TodayMetrics {
  todaysSales: number;
  customersServed: number;
  currentCovers: number;
  averageRating: number;
}

export default function LiveDashboard() {
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([]);
  const [metrics, setMetrics] = useState<TodayMetrics>({
    todaysSales: 0,
    customersServed: 0,
    currentCovers: 0,
    averageRating: 4.2
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchLiveData();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch tables status
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('id, table_number, occupied, is_active')
        .eq('is_active', true)
        .order('table_number');

      if (!tablesError && tablesData) {
        const tablesWithStatus: TableStatus[] = await Promise.all(
          tablesData.map(async (table) => {
            // Check for active sessions
            const { data: sessionData } = await supabase
              .from('sessions')
              .select('id, started_by_name, diners, status')
              .eq('table_id', table.id)
              .eq('status', 'active')
              .single();

            let status: 'available' | 'occupied' | 'payment_pending' = 'available';
            let orderValue = 0;
            let diners = 0;

            if (sessionData) {
              status = 'occupied';
              diners = Array.isArray(sessionData.diners) ? sessionData.diners.length : 1;
              
              // Calculate order value from orders
              const { data: ordersData } = await supabase
                .from('orders')
                .select(`
                  quantity,
                  menu_items (price)
                `)
                .eq('session_id', sessionData.id)
                .in('status', ['confirmed', 'preparing', 'ready', 'served']);

              if (ordersData) {
                orderValue = ordersData.reduce((sum, order) => 
                  sum + ((order.menu_items?.price || 0) * order.quantity), 0
                );
              }
            }

            return {
              id: table.id,
              tableNumber: table.table_number,
              status,
              orderValue,
              diners,
              sessionId: sessionData?.id
            };
          })
        );
        setTables(tablesWithStatus);
      }

      // Fetch kitchen orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          quantity,
          status,
          created_at,
          sessions (table_id),
          menu_items (name)
        `)
        .in('status', ['preparing', 'ready'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (!ordersError && ordersData) {
        const kitchenOrdersFormatted: KitchenOrder[] = ordersData.map(order => ({
          id: order.id,
          tableNumber: `T${order.sessions?.table_id?.slice(-2) || 'XX'}`,
          items: `${order.quantity}x ${order.menu_items?.name || 'Item'}`,
          status: order.status as 'preparing' | 'ready',
          orderTime: new Date(order.created_at).toLocaleTimeString()
        }));
        setKitchenOrders(kitchenOrdersFormatted);
      }

      // Generate live activity (mock data for now)
      const mockActivity: LiveActivity[] = [
        {
          id: '1',
          type: 'payment',
          description: 'Table 3 paid ₱425.00 via Orange Money',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          amount: 425
        },
        {
          id: '2',
          type: 'order',
          description: 'Table 7 ordered 2x Cocktails',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'session',
          description: 'Table 5 completed session',
          timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          amount: 380
        }
      ];
      setLiveActivity(mockActivity);

      // Calculate today's metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .gte('started_at', today.toISOString());

      let todaysSales = 0;
      let customersServed = 0;
      let currentCovers = 0;

      if (sessionsData) {
        customersServed = sessionsData.length;
        currentCovers = tablesWithStatus.reduce((sum, table) => sum + (table.diners || 0), 0);
        
        // Calculate sales from completed sessions
        const completedSessions = sessionsData.filter(s => s.status === 'completed');
        todaysSales = completedSessions.reduce((sum, session) => 
          sum + (session.total_amount || 0), 0
        );
      }

      setMetrics({
        todaysSales,
        customersServed,
        currentCovers,
        averageRating: 4.2 // Mock data
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching live data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-yellow-500';
      case 'payment_pending': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTableStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'occupied': return 'Occupied';
      case 'payment_pending': return 'Payment Pending';
      default: return 'Unknown';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };


  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Dashboard</h1>
          <p className="text-gray-600">Real-time restaurant operations</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="h-4 w-4" />
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Live Activity Ticker */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
        </div>
        <div className="overflow-hidden">
          <div className="flex space-x-6 animate-pulse">
            {liveActivity.map((activity, index) => (
              <div key={activity.id} className="flex items-center space-x-2 text-sm whitespace-nowrap">
                <span className="text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                <span className="text-gray-900">{activity.description}</span>
                {activity.amount && (
                  <span className="font-medium text-green-600">{formatCurrency(activity.amount)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Floor Plan - Takes up ~60% of width */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Live Floor Plan</h3>
              </div>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Occupied</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Payment Pending</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    table.status === 'available' ? 'border-green-200 bg-green-50' :
                    table.status === 'occupied' ? 'border-yellow-200 bg-yellow-50' :
                    'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="text-center">
                    <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getTableStatusColor(table.status)}`}></div>
                    <div className="font-bold text-lg text-gray-900">T{table.tableNumber}</div>
                    <div className="text-sm text-gray-600">{getTableStatusText(table.status)}</div>
                    {table.orderValue > 0 && (
                      <div className="text-sm font-medium text-green-600 mt-1">
                        {formatCurrency(table.orderValue)}
                      </div>
                    )}
                    {table.diners > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {table.diners} {table.diners === 1 ? 'diner' : 'diners'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Kitchen Queue and Metrics */}
        <div className="lg:col-span-4 space-y-6">
          {/* Kitchen Queue */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <ChefHat className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Kitchen Now</h3>
            </div>
            
            <div className="space-y-3">
              {kitchenOrders.length > 0 ? (
                kitchenOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{order.items}</div>
                      <div className="text-sm text-gray-600">{order.tableNumber} • {order.orderTime}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'ready' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status === 'ready' ? 'Ready' : 'Preparing'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <ChefHat className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No active orders</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Key Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Metrics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.todaysSales)}</div>
                <div className="text-sm text-gray-600">Today's Sales</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{metrics.customersServed}</div>
                <div className="text-sm text-gray-600">Customers Served</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{metrics.currentCovers}</div>
                <div className="text-sm text-gray-600">Current Covers</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{metrics.averageRating}</div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
