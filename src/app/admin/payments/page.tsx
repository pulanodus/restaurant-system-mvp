'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  CreditCard,
  Clock,
  User,
  CheckCircle,
  DollarSign,
  Calendar,
  Eye
} from 'lucide-react';

interface CompletedPayment {
  id: string;
  session_id: string;
  table_number: string;
  subtotal: number;
  vat_amount: number;
  tip_amount: number;
  final_total: number;
  payment_method: string;
  payment_type: string; // 'individual' or 'table'
  completed_by: string;
  completed_at: string;
  diners_count?: number;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<CompletedPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<CompletedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, selectedMethod, selectedType, dateRange]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch completed payments from the admin API
      const response = await fetch('/api/admin/payments', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to load payments');
      }

      const data = await response.json();
      
      if (data.success) {
        setPayments(data.payments || []);
      } else {
        throw new Error(data.error || 'Failed to load payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError(error instanceof Error ? error.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(payment => 
        payment.table_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.completed_by.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by payment method
    if (selectedMethod !== 'all') {
      filtered = filtered.filter(payment => payment.payment_method === selectedMethod);
    }

    // Filter by payment type
    if (selectedType !== 'all') {
      filtered = filtered.filter(payment => payment.payment_type === selectedType);
    }

    // Filter by date range
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    filtered = filtered.filter(payment => new Date(payment.completed_at) >= startDate);

    setFilteredPayments(filtered);
  };

  const formatCurrency = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <DollarSign className="w-4 h-4" />;
      case 'card':
      case 'credit_card':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getUniqueMethods = () => {
    return [...new Set(payments.map(payment => payment.payment_method))];
  };

  const getUniqueTypes = () => {
    return [...new Set(payments.map(payment => payment.payment_type))];
  };

  const exportPayments = () => {
    const csvContent = [
      ['Date', 'Time', 'Table', 'Payment Method', 'Payment Type', 'Subtotal', 'VAT', 'Tip', 'Total', 'Completed By'],
      ...filteredPayments.map(payment => {
        const timestamp = formatDate(payment.completed_at);
        return [
          timestamp.date,
          timestamp.time,
          payment.table_number,
          payment.payment_method,
          payment.payment_type,
          payment.subtotal.toFixed(2),
          payment.vat_amount.toFixed(2),
          payment.tip_amount.toFixed(2),
          payment.final_total.toFixed(2),
          payment.completed_by
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateTotals = () => {
    return filteredPayments.reduce((totals, payment) => ({
      subtotal: totals.subtotal + payment.subtotal,
      vat: totals.vat + payment.vat_amount,
      tip: totals.tip + payment.tip_amount,
      total: totals.total + payment.final_total,
      count: totals.count + 1
    }), { subtotal: 0, vat: 0, tip: 0, total: 0, count: 0 });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00d9ff]"></div>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600">Completed payment transactions and financial records</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportPayments}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchPayments}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#00d9ff] rounded-lg hover:bg-[#00c4e6] transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">{totals.count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Order</p>
              <p className="text-2xl font-bold text-gray-900">
                {totals.count > 0 ? formatCurrency(totals.total / totals.count) : 'P0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <User className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">VAT Collected</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.vat)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
              />
            </div>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
            >
              <option value="all">All Methods</option>
              {getUniqueMethods().map(method => (
                <option key={method} value={method}>
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
            >
              <option value="all">All Types</option>
              {getUniqueTypes().map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-[#f0fdff] border border-[#ccf2ff] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CreditCard className="h-5 w-5 text-[#00d9ff] mr-2" />
            <span className="text-[#00d9ff] font-medium">
              Showing {filteredPayments.length} of {payments.length} completed payments
            </span>
          </div>
          <span className="text-[#00d9ff] text-sm">
            Total: {formatCurrency(totals.total)} | Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {filteredPayments.length > 0 ? (
            filteredPayments.map((payment) => {
              const timestamp = formatDate(payment.completed_at);

              return (
                <div key={payment.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-2">
                          {getPaymentMethodIcon(payment.payment_method)}
                          <span className="font-medium text-gray-900">
                            {payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1)} Payment
                          </span>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.payment_type === 'table' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{timestamp.date} at {timestamp.time}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900">Table {payment.table_number}</h4>
                          <p className="text-sm text-gray-600">Session: {payment.session_id.slice(-8)}</p>
                          {payment.diners_count && payment.diners_count > 0 && (
                            <p className="text-sm text-gray-600">{payment.diners_count} diners</p>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Payment Breakdown</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Subtotal: {formatCurrency(payment.subtotal)}</div>
                            <div>VAT: {formatCurrency(payment.vat_amount)}</div>
                            <div>Tip: {formatCurrency(payment.tip_amount)}</div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Total Amount</h4>
                          <div className="text-2xl font-bold text-[#00d9ff]">
                            {formatCurrency(payment.final_total)}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Completed By</h4>
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="h-4 w-4 mr-2" />
                            <span>{payment.completed_by}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => window.open(`/admin/session/${payment.session_id}`, '_blank')}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-600">
                {payments.length === 0 
                  ? 'No completed payments have been recorded yet.'
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
