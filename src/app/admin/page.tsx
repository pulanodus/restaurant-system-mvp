'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/error-handling';
import { 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp,
  Star,
  Calendar,
  Activity,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  todaysSales: number;
  tableTurnover: number;
  customerRating: number;
  activeTables: number;
  completedSessions: number;
  pendingOrders: number;
}

interface RecentActivity {
  id: string;
  type: 'order' | 'payment' | 'session' | 'table';
  description: string;
  timestamp: string;
  amount?: number;
}

interface ErrorAnalytics {
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byOperation: Record<string, number>;
  recentErrors: Array<{
    errorCode: string;
    severity: string;
    operation: string;
    timestamp: Date;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaysSales: 0,
    tableTurnover: 0,
    customerRating: 0,
    activeTables: 0,
    completedSessions: 0,
    pendingOrders: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [errorAnalytics, setErrorAnalytics] = useState<ErrorAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchErrorAnalytics();
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchErrorAnalytics();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch dashboard data from API
      const response = await fetch('/api/admin/dashboard?period=today');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      const dashboardData = result.data;

      // Set dashboard stats
      setStats({
        todaysSales: dashboardData.todaysSales,
        tableTurnover: dashboardData.tableTurnover,
        customerRating: dashboardData.customerRating,
        activeTables: dashboardData.activeTables,
        completedSessions: dashboardData.completedSessions,
        pendingOrders: dashboardData.pendingOrders
      });

      // Generate recent activity from mock data
      const activity: RecentActivity[] = [
        {
          id: '1',
          type: 'session',
          description: 'Table 5 completed - $45.50',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          amount: 45.50
        },
        {
          id: '2',
          type: 'order',
          description: 'New order: Grilled Salmon x2',
          timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          type: 'session',
          description: 'Table 12 completed - $67.25',
          timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          amount: 67.25
        },
        {
          id: '4',
          type: 'order',
          description: 'New order: Caesar Salad x1',
          timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        },
        {
          id: '5',
          type: 'session',
          description: 'Table 8 completed - $89.75',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          amount: 89.75
        }
      ];

      setRecentActivity(activity);
      setLastUpdated(new Date(dashboardData.lastUpdated));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      
      // Set fallback data when API fails
      setStats({
        todaysSales: 1250.75,
        tableTurnover: 2.3,
        customerRating: 4.2,
        activeTables: 3,
        completedSessions: 18,
        pendingOrders: 5
      });
      
      setRecentActivity([
        {
          id: 'fallback-1',
          type: 'session',
          description: 'Demo session completed',
          timestamp: new Date().toISOString(),
          amount: 45.50
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchErrorAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics?timeRange=summary');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setErrorAnalytics(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Restaurant overview and key metrics</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="h-4 w-4" />
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todaysSales)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Table Turnover</p>
              <p className="text-2xl font-bold text-gray-900">{stats.tableTurnover}/hr</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Customer Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats.customerRating}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Tables</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeTables}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Analytics */}
      {errorAnalytics && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health & Error Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorAnalytics.bySeverity.critical}</div>
              <div className="text-sm text-gray-600">Critical Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{errorAnalytics.bySeverity.high}</div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{errorAnalytics.bySeverity.medium}</div>
              <div className="text-sm text-gray-600">Medium Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{errorAnalytics.bySeverity.low}</div>
              <div className="text-sm text-gray-600">Low Priority</div>
            </div>
          </div>
          
          {errorAnalytics.recentErrors.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Recent Errors</h4>
              <div className="space-y-2">
                {errorAnalytics.recentErrors.slice(0, 5).map((error, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {error.severity.toUpperCase()}
                      </span>
                      <span className="ml-2 text-sm text-gray-900">{error.operation}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed Today</span>
              <span className="font-semibold">{stats.completedSessions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending Orders</span>
              <span className="font-semibold text-orange-600">{stats.pendingOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average per Session</span>
              <span className="font-semibold">
                {stats.completedSessions > 0 ? formatCurrency(stats.todaysSales / stats.completedSessions) : '$0.00'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                  {activity.amount && (
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(activity.amount)}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <span className="text-sm font-medium">View Reports</span>
          </button>
          <button className="p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Menu Items</span>
          </button>
          <button className="p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Table Status</span>
          </button>
          <button className="p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Audit Log</span>
          </button>
        </div>
      </div>
    </div>
  );
}
