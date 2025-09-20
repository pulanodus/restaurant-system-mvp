'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ChefHat,
  Timer,
  Eye,
  CheckSquare
} from 'lucide-react';

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  status: 'waiting' | 'preparing' | 'ready' | 'served';
  created_at: string;
  updated_at: string;
  special_instructions?: string;
  menu_item: {
    id: string;
    name: string;
    description?: string;
    price: number;
  };
}

interface Order {
  id: string;
  session_id: string;
  table_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  session: {
    id: string;
    table_id: string;
    started_by_name?: string;
    created_at: string;
  };
}

interface TableOrder {
  table_number: string;
  orders: Order[];
  total_items: number;
  waiting_items: number;
  ready_items: number;
  served_items: number;
}

export default function KitchenDisplay() {
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  const [allDailyOrders, setAllDailyOrders] = useState<TableOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load kitchen orders
  const loadKitchenOrders = async (silent = false) => {
    try {
      if (!silent) {
      setIsLoading(true);
      }
      setError(null);

      // Fetch confirmed orders with their items
      const response = await fetch('/api/orders/kitchen');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      const orders: Order[] = data.confirmedOrders || [];
      
      // Group orders by table
      const tableMap = new Map<string, Order[]>();
      
      orders.forEach(order => {
        if (!tableMap.has(order.table_number)) {
          tableMap.set(order.table_number, []);
        }
        tableMap.get(order.table_number)!.push(order);
      });

      // Convert to table orders format
      const tableOrdersData: TableOrder[] = Array.from(tableMap.entries()).map(([tableNumber, orders]) => {
        const allItems = orders.flatMap(order => order.order_items);
        const waitingItems = allItems.filter(item => item.status === 'waiting').length;
        const readyItems = allItems.filter(item => item.status === 'ready').length;
        const servedItems = allItems.filter(item => item.status === 'served').length;
        
        return {
          table_number: tableNumber,
          orders,
          total_items: allItems.length,
          waiting_items: waitingItems,
          ready_items: readyItems,
          served_items: servedItems
        };
      });

      // Store all daily orders for filter counts
      setAllDailyOrders(tableOrdersData);
      
      // Sort by table number and filter out tables with no active orders for Kanban display
      setTableOrders(
        tableOrdersData
          .filter(table => table.total_items > table.served_items) // Only show tables with pending items
          .sort((a, b) => a.table_number.localeCompare(b.table_number))
      );
      
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error loading kitchen orders:', error);
      if (!silent) {
      setError(error instanceof Error ? error.message : 'Failed to load orders');
      }
    } finally {
      if (!silent) {
      setIsLoading(false);
      }
    }
  };

  // Load data on mount
  useEffect(() => {
    loadKitchenOrders();
  }, []);

  // Auto-refresh every 30 seconds (silent)
  useEffect(() => {
    const interval = setInterval(() => {
      loadKitchenOrders(true); // Silent refresh - no loading spinner
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Update order item status
  const updateOrderItemStatus = async (orderItemId: string, newStatus: 'preparing' | 'ready' | 'served') => {
    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderItemId,
          status: newStatus
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update status');
      }

      // Reload data to reflect changes
      await loadKitchenOrders();
      
    } catch (error) {
      console.error('Error updating order status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  // Calculate waiting time
  const getWaitingTime = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    return diffInMinutes;
  };

  // Get status color and icon
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'waiting':
        return {
          color: 'bg-pink-100 text-pink-800',
          icon: <Clock className="w-4 h-4" />,
          text: 'Waiting'
        };
      case 'preparing':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: <ChefHat className="w-4 h-4" />,
          text: 'Preparing'
        };
      case 'ready':
        return {
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Ready'
        };
      case 'served':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: <CheckSquare className="w-4 h-4" />,
          text: 'Served'
        };
      default:
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: <AlertCircle className="w-4 h-4" />,
          text: 'Pending'
        };
    }
  };

  // Get filtered orders based on status filter
  const getFilteredOrders = () => {
    if (statusFilter === 'all') {
      return tableOrders; // Show only active orders for Kanban
    }
    
    // For specific status filters, show all daily orders with that status
    return allDailyOrders.map(tableOrder => ({
      ...tableOrder,
      orders: tableOrder.orders.map(order => ({
        ...order,
        order_items: order.order_items.filter(item => {
          if (statusFilter === 'ready') {
            return item.status === 'ready' || item.status === 'served';
          }
          return item.status === statusFilter;
        })
      }))
    })).filter(tableOrder => 
      tableOrder.orders.some(order => order.order_items.length > 0)
    );
  };

  // Get action button for order item
  const getActionButton = (item: OrderItem) => {
    switch (item.status) {
      case 'waiting':
        return (
          <button
            onClick={() => updateOrderItemStatus(item.id, 'preparing')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Start Preparing
          </button>
        );
      case 'preparing':
        return (
          <button
            onClick={() => updateOrderItemStatus(item.id, 'ready')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Mark Ready
          </button>
        );
      case 'ready':
        return (
          <button
            onClick={() => updateOrderItemStatus(item.id, 'served')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Mark Served
          </button>
        );
      case 'served':
        return (
          <span className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium">
            Completed
          </span>
        );
      default:
        return (
          <button
            onClick={() => updateOrderItemStatus(item.id, 'preparing')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
          >
            Start Preparing
          </button>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading kitchen orders...</p>
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
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Kitchen Display</h1>
                <p className="text-gray-600">Order preparation status for all tables</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Last updated:</p>
                <p className="text-sm font-medium text-gray-900">
                  {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => loadKitchenOrders(false)} // Show loading spinner for manual refresh
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh orders"
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

        {/* Status Filter Buttons */}
        {allDailyOrders.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Daily Orders</h3>
              <div className="text-sm text-gray-600">
                Total: {allDailyOrders.reduce((sum, table) => 
                  sum + table.orders.flatMap(o => o.order_items).length, 0
                )} items today
              </div>
          </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'all' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Orders
              </button>
              <button
                onClick={() => setStatusFilter('waiting')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'waiting' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                }`}
              >
                Waiting ({allDailyOrders.reduce((sum, table) => 
                  sum + table.orders.flatMap(o => o.order_items).filter(item => item.status === 'waiting').length, 0
                )})
              </button>
              <button
                onClick={() => setStatusFilter('preparing')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'preparing' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                Preparing ({allDailyOrders.reduce((sum, table) => 
                  sum + table.orders.flatMap(o => o.order_items).filter(item => item.status === 'preparing').length, 0
                )})
              </button>
              <button
                onClick={() => setStatusFilter('ready')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'ready' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Ready ({allDailyOrders.reduce((sum, table) => 
                  sum + table.orders.flatMap(o => o.order_items).filter(item => item.status === 'ready' || item.status === 'served').length, 0
                )})
              </button>
              <button
                onClick={() => setStatusFilter('served')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'served' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Served ({allDailyOrders.reduce((sum, table) => 
                  sum + table.orders.flatMap(o => o.order_items).filter(item => item.status === 'served').length, 0
                )})
              </button>
            </div>
                    </div>
        )}

        {/* Kanban Board */}
        {(() => {
          const filteredOrders = getFilteredOrders();
          
          if (filteredOrders.length === 0) {
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {statusFilter === 'all' ? 'No Active Orders' : `No ${statusFilter} Orders`}
                      </h3>
                <p className="text-gray-600">
                  {statusFilter === 'all' 
                    ? 'All orders have been completed or no orders are currently in the kitchen.'
                    : `No orders with status "${statusFilter}" found for today.`
                  }
                </p>
                    </div>
            );
          }

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Waiting Column */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Waiting</h3>
                    <p className="text-sm text-gray-600">
                      {filteredOrders.reduce((sum, table) => 
                        sum + table.orders.flatMap(o => o.order_items).filter(item => item.status === 'waiting').length, 0
                      )} items
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredOrders.flatMap(tableOrder => 
                    tableOrder.orders.flatMap(order => 
                      order.order_items.filter(item => item.status === 'waiting')
                    )
                  ).map((item) => {
                    const waitingTime = getWaitingTime(item.created_at);
                  const tableNumber = filteredOrders.find(table => 
                    table.orders.some(order => 
                      order.order_items.some(orderItem => orderItem.id === item.id)
                    )
                  )?.table_number || 'Unknown';
                    
                    return (
                      <div
                        key={item.id}
                      className="p-4 rounded-lg border border-pink-200 bg-pink-50 hover:bg-pink-100 transition-colors cursor-pointer"
                      onClick={() => updateOrderItemStatus(item.id, 'preparing')}
                    >
                      <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                              {item.menu_item.name}
                            </h4>
                          <p className="text-xs text-gray-600">
                            Table {tableNumber} • Qty: {item.quantity}
                            </p>
                            {item.special_instructions && (
                            <p className="text-xs text-blue-600 mt-1">
                                Note: {item.special_instructions}
                              </p>
                            )}
                          </div>
                        <div className="text-xs text-pink-600 font-medium">
                          {waitingTime}m
                        </div>
                          </div>
                      <div className="text-xs text-gray-500">
                        Click to start preparing
                        </div>
                      </div>
                    );
                  })}
              </div>
                </div>

              {/* Preparing Column */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Preparing</h3>
                    <p className="text-sm text-gray-600">
                      {filteredOrders.reduce((sum, table) => 
                        sum + table.orders.flatMap(o => o.order_items).filter(item => item.status === 'preparing').length, 0
                      )} items
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {filteredOrders.flatMap(tableOrder => 
                    tableOrder.orders.flatMap(order => 
                      order.order_items.filter(item => item.status === 'preparing')
                    )
                  ).map((item) => {
                  const waitingTime = getWaitingTime(item.created_at);
                  const tableNumber = filteredOrders.find(table => 
                    table.orders.some(order => 
                      order.order_items.some(orderItem => orderItem.id === item.id)
                    )
                  )?.table_number || 'Unknown';
                  
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer"
                      onClick={() => updateOrderItemStatus(item.id, 'ready')}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {item.menu_item.name}
                          </h4>
                          <p className="text-xs text-gray-600">
                            Table {tableNumber} • Qty: {item.quantity}
                          </p>
                          {item.special_instructions && (
                            <p className="text-xs text-blue-600 mt-1">
                              Note: {item.special_instructions}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-yellow-600 font-medium">
                          {waitingTime}m
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Click when ready
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>

              {/* Ready Column */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Ready & Served</h3>
                    <p className="text-sm text-gray-600">
                      {filteredOrders.reduce((sum, table) => 
                    sum + table.orders.flatMap(o => o.order_items).filter(item => item.status === 'ready' || item.status === 'served').length, 0
                      )} items
                </p>
                  </div>
              </div>
                
                <div className="space-y-4">
                  {filteredOrders.flatMap(tableOrder => 
                    tableOrder.orders.flatMap(order => 
                      order.order_items.filter(item => item.status === 'ready' || item.status === 'served')
                    )
                  ).map((item) => {
                  const waitingTime = getWaitingTime(item.created_at);
                  const tableNumber = filteredOrders.find(table => 
                    table.orders.some(order => 
                      order.order_items.some(orderItem => orderItem.id === item.id)
                    )
                  )?.table_number || 'Unknown';
                  
                  const isServed = item.status === 'served';
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isServed 
                          ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' 
                          : 'border-green-200 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {item.menu_item.name}
                            </h4>
                            {isServed && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Served
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            Table {tableNumber} • Qty: {item.quantity}
                          </p>
                          {item.special_instructions && (
                            <p className="text-xs text-blue-600 mt-1">
                              Note: {item.special_instructions}
                            </p>
                          )}
                        </div>
                        <div className={`text-xs font-medium ${
                          isServed ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {waitingTime}m
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          );
        })()}


      </div>
    </div>
  );
}
