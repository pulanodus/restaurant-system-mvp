'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Star,
  Calendar,
  Clock,
  PieChart
} from 'lucide-react';

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

interface TopMenuItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface AnalyticsData {
  salesLastWeek: SalesData[];
  topMenuItems: TopMenuItem[];
  customerRating: number;
  totalTips: number;
  averageOrderValue: number;
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    salesLastWeek: [],
    topMenuItems: [],
    customerRating: 4.2,
    totalTips: 0,
    averageOrderValue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case 'year':
          startDate.setDate(endDate.getDate() - 365);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      // Fetch sales data
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString());

      let salesLastWeek: SalesData[] = [];
      let totalSales = 0;
      let totalOrders = 0;

      if (!sessionsError && sessionsData) {
        // Group by date
        const salesByDate: { [key: string]: { sales: number; orders: number } } = {};
        
        sessionsData.forEach(session => {
          const date = new Date(session.started_at).toISOString().split('T')[0];
          if (!salesByDate[date]) {
            salesByDate[date] = { sales: 0, orders: 0 };
          }
          salesByDate[date].sales += session.total_amount || 0;
          salesByDate[date].orders += 1;
          totalSales += session.total_amount || 0;
          totalOrders += 1;
        });

        salesLastWeek = Object.entries(salesByDate).map(([date, data]) => ({
          date,
          sales: data.sales,
          orders: data.orders
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }

      // Fetch top menu items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          quantity,
          menu_items (name, price)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      let topMenuItems: TopMenuItem[] = [];
      if (!ordersError && ordersData) {
        const itemStats: { [key: string]: { quantity: number; revenue: number } } = {};
        
        ordersData.forEach(order => {
          const itemName = order.menu_items?.name || 'Unknown Item';
          const price = order.menu_items?.price || 0;
          
          if (!itemStats[itemName]) {
            itemStats[itemName] = { quantity: 0, revenue: 0 };
          }
          itemStats[itemName].quantity += order.quantity;
          itemStats[itemName].revenue += price * order.quantity;
        });

        topMenuItems = Object.entries(itemStats).map(([name, stats]) => ({
          name,
          quantity: stats.quantity,
          revenue: stats.revenue
        })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
      }

      setAnalyticsData({
        salesLastWeek,
        topMenuItems,
        customerRating: 4.2, // Mock data
        totalTips: 0, // Mock data
        averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
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
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Historical data and performance insights</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex space-x-2">
          {['week', 'month', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.salesLastWeek.reduce((sum, day) => sum + day.sales, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.averageOrderValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Customer Rating</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.customerRating}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.salesLastWeek.reduce((sum, day) => sum + day.orders, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Sales Last {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}</h3>
          </div>
          
          {analyticsData.salesLastWeek.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.salesLastWeek.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{formatDate(day.date)}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatCurrency(day.sales)}</div>
                    <div className="text-xs text-gray-500">{day.orders} orders</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No sales data available</p>
            </div>
          )}
        </div>

        {/* Top Menu Items */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-6">
            <PieChart className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Top Menu Items</h3>
          </div>
          
          {analyticsData.topMenuItems.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.topMenuItems.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.quantity} sold</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatCurrency(item.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No menu data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Tip Reporting */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-6">
          <DollarSign className="h-5 w-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">Tip Reporting</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(analyticsData.totalTips)}</div>
            <div className="text-sm text-gray-600">Total Tips</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">12%</div>
            <div className="text-sm text-gray-600">Average Tip Rate</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">₱45</div>
            <div className="text-sm text-gray-600">Average Tip Amount</div>
          </div>
        </div>
      </div>
    </div>
  );
}
