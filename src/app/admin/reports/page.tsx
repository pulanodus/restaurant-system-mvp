'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/error-handling';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Clock,
  Star,
  Download,
  Calendar,
  Filter,
  PieChart,
  Activity
} from 'lucide-react';

interface SalesData {
  date: string;
  total: number;
  orders: number;
  tips: number;
}

interface ItemSalesData {
  item_name: string;
  quantity: number;
  revenue: number;
  category: string;
}

interface TimeSeriesData {
  hour: number;
  sales: number;
  orders: number;
}

interface ReportPeriod {
  label: string;
  value: string;
  days: number;
}

const reportPeriods: ReportPeriod[] = [
  { label: 'Today', value: 'today', days: 1 },
  { label: 'Last 7 Days', value: 'week', days: 7 },
  { label: 'Last 30 Days', value: 'month', days: 30 },
  { label: 'Last 90 Days', value: 'quarter', days: 90 }
];

export default function SalesReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [itemSalesData, setItemSalesData] = useState<ItemSalesData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalTips: 0,
    topCategory: '',
    peakHour: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalesData();
  }, [selectedPeriod]);

  const fetchSalesData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const period = reportPeriods.find(p => p.value === selectedPeriod);
      if (!period) return;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - period.days);

      // Fetch sessions and orders data
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          orders (
            *,
            menu_items (
              name,
              category,
              price
            )
          )
        `)
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString())
        .eq('status', 'completed');

      if (sessionsError) throw sessionsError;

      // Process sales data by date
      const salesByDate: Record<string, SalesData> = {};
      const itemSales: Record<string, ItemSalesData> = {};
      const timeSeries: Record<number, TimeSeriesData> = {};
      
      let totalSales = 0;
      let totalOrders = 0;
      let totalTips = 0;
      const categoryTotals: Record<string, number> = {};

      if (sessionsData) {
        sessionsData.forEach(session => {
          const date = new Date(session.started_at).toISOString().split('T')[0];
          const hour = new Date(session.started_at).getHours();
          
          if (!salesByDate[date]) {
            salesByDate[date] = {
              date,
              total: 0,
              orders: 0,
              tips: 0
            };
          }

          if (!timeSeries[hour]) {
            timeSeries[hour] = {
              hour,
              sales: 0,
              orders: 0
            };
          }

          if (session.orders) {
            session.orders.forEach((order: any) => {
              const itemTotal = order.quantity * order.price;
              salesByDate[date].total += itemTotal;
              salesByDate[date].orders += order.quantity;
              timeSeries[hour].sales += itemTotal;
              timeSeries[hour].orders += order.quantity;
              
              totalSales += itemTotal;
              totalOrders += order.quantity;

              // Track item sales
              const itemKey = order.menu_items?.name || 'Unknown Item';
              if (!itemSales[itemKey]) {
                itemSales[itemKey] = {
                  item_name: itemKey,
                  quantity: 0,
                  revenue: 0,
                  category: order.menu_items?.category || 'Unknown'
                };
              }
              itemSales[itemKey].quantity += order.quantity;
              itemSales[itemKey].revenue += itemTotal;

              // Track category totals
              const category = order.menu_items?.category || 'Unknown';
              categoryTotals[category] = (categoryTotals[category] || 0) + itemTotal;
            });
          }

          // Add tips (mock data - in real app this would come from payment data)
          const sessionTips = Math.random() * 10 + 5; // $5-15 tips per session
          salesByDate[date].tips += sessionTips;
          totalTips += sessionTips;
        });
      }

      // Sort and format data
      const sortedSalesData = Object.values(salesByDate).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const sortedItemSales = Object.values(itemSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10 items

      const sortedTimeSeries = Object.values(timeSeries)
        .sort((a, b) => a.hour - b.hour);

      const topCategory = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      const peakHour = sortedTimeSeries
        .sort((a, b) => b.sales - a.sales)[0]?.hour || 0;

      setSalesData(sortedSalesData);
      setItemSalesData(sortedItemSales);
      setTimeSeriesData(sortedTimeSeries);
      
      setSummary({
        totalSales,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
        totalTips,
        topCategory,
        peakHour
      });

    } catch (error) {
      console.error('Error fetching sales data:', error);
      setError('Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const exportReport = () => {
    const csvContent = [
      ['Date', 'Total Sales', 'Orders', 'Tips'],
      ...salesData.map(data => [
        data.date,
        data.total.toFixed(2),
        data.orders.toString(),
        data.tips.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-gray-600">Revenue analytics and performance insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <Calendar className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Report Period</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {reportPeriods.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalSales)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.averageOrderValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tips</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalTips)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Over Time</h3>
          <div className="space-y-3">
            {salesData.map((data, index) => (
              <div key={data.date} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{formatDate(data.date)}</span>
                    <span className="text-sm text-gray-600">{formatCurrency(data.total)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.max(5, (data.total / Math.max(...salesData.map(d => d.total))) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Items</h3>
          <div className="space-y-3">
            {itemSalesData.slice(0, 8).map((item, index) => (
              <div key={item.item_name} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">{item.item_name}</span>
                    <span className="text-sm text-gray-600">{formatCurrency(item.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.max(5, (item.revenue / Math.max(...itemSalesData.map(i => i.revenue))) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{item.category}</span>
                    <span className="text-xs text-gray-500">{item.quantity} sold</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Sales Pattern */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Sales Pattern</h3>
        <div className="grid grid-cols-12 gap-2">
          {timeSeriesData.map((data) => (
            <div key={data.hour} className="text-center">
              <div className="bg-blue-50 rounded-lg p-2 mb-2">
                <div className="text-xs font-medium text-gray-900">{data.hour}:00</div>
                <div className="text-xs text-gray-600">{formatCurrency(data.sales)}</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.max(5, (data.sales / Math.max(...timeSeriesData.map(d => d.sales))) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Peak Sales Hour</span>
              <span className="font-medium">{summary.peakHour}:00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Top Category</span>
              <span className="font-medium">{summary.topCategory}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tips Percentage</span>
              <span className="font-medium">
                {summary.totalSales > 0 ? ((summary.totalTips / summary.totalSales) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Daily Average</span>
              <span className="font-medium">
                {formatCurrency(summary.totalSales / Math.max(1, salesData.length))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Orders per Day</span>
              <span className="font-medium">
                {Math.round(summary.totalOrders / Math.max(1, salesData.length))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Best Day</span>
              <span className="font-medium">
                {salesData.length > 0 ? formatDate(salesData.sort((a, b) => b.total - a.total)[0].date) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
