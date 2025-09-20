'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Users, 
  Receipt, 
  CreditCard, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  ChefHat,
  ArrowRightLeft,
  Settings,
  DollarSign,
  User,
  Share2,
  Bell,
  Clock
} from 'lucide-react';
import { useAudioNotification, getNotificationSoundType } from '@/lib/audio-notifications';
import AudioSettings from '@/app/components/AudioSettings';
import PaymentProcessingModal from '@/app/components/PaymentProcessingModal';

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  status: 'waiting' | 'preparing' | 'ready' | 'served' | 'ordered';
  created_at: string;
  notes?: string;
  is_shared: boolean;
  is_takeaway: boolean;
  diner_name?: string;
  menu_items: {
    id: string;
    name: string;
    price: number;
  };
  split_bills?: {
    id: string;
    original_price: number;
    split_price: number;
    split_count: number;
    participants: string[];
  };
}

interface Session {
  id: string;
  table_id: string;
  status: string;
  started_by_name?: string;
  created_at: string;
  payment_status?: string;
  final_total?: number;
  tables: {
    id: string;
    table_number: string;
    capacity: number;
  };
}

interface ProcessedOrderItem {
  id: string;
  menu_items: any;
  split_bills: any;
  quantity: number;
  diner_name: string;
  isShared: boolean;
  itemPrice: number;
  sharedWith?: string[];
}

interface Diner {
  id: string;
  name: string;
  color: string;
  avatar: string;
  orders: ProcessedOrderItem[];
  personalTotal: number;
  sharedTotal: number;
  total: number;
}

export default function ActiveSessionView() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [diners, setDiners] = useState<Diner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'individual'>('table');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [selectedDestinationTable, setSelectedDestinationTable] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'kitchen' | 'waitstaff' | 'unknown'>('unknown');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'ready' | 'payment' | 'help';
    message: string;
    tableNumber: string;
    orderId?: string;
    timestamp: Date;
    resolved: boolean;
  }>>([]);
  const { playSound } = useAudioNotification();

  // Payment processing state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<'individual' | 'table'>('individual');
  const [selectedDiner, setSelectedDiner] = useState<Diner | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [individualPayments, setIndividualPayments] = useState<Array<{
    diner_name: string;
    payment_amount: number;
    payment_method: string;
    payment_status: string;
    completed_at: string;
    completed_by: string;
  }>>([]);

  // Load session data
  const loadSessionData = async (isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setIsRefreshing(true);
      } else {
      setIsLoading(true);
      }
      setError(null);

      // Fetch session details
      const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
      const sessionData = await sessionResponse.json();
      
      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Failed to fetch session');
      }

      setSession(sessionData.session);

      // Fetch orders for this session using the same logic as Live Bill
      const ordersResponse = await fetch(`/api/orders/confirm?sessionId=${sessionId}&isLiveBillRequest=true`);
      const ordersData = await ordersResponse.json();
      
      if (!ordersData.success) {
        throw new Error(ordersData.error || 'Failed to fetch orders');
      }

      const orderItems = ordersData.confirmedOrders || [];

      setOrders(orderItems);
      
      // Process diners and their orders
      processDiners(orderItems);

      // Load individual payment status
      await loadIndividualPaymentStatus();

    } catch (error) {
      console.error('Error loading session data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load session');
    } finally {
      if (isBackgroundRefresh) {
        setIsRefreshing(false);
      } else {
      setIsLoading(false);
      }
    }
  };

  // Load individual payment status
  const loadIndividualPaymentStatus = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/payment/individual-status?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.success && data.individual_payments) {
        setIndividualPayments(data.individual_payments);
      }
    } catch (error) {
      console.error('Error loading individual payment status:', error);
    }
  };

  // Check if a diner has already paid
  const hasDinerPaid = (dinerName: string) => {
    return individualPayments.some(payment => 
      payment.diner_name === dinerName && payment.payment_status === 'completed'
    );
  };

  // Get payment info for a diner
  const getDinerPaymentInfo = (dinerName: string) => {
    return individualPayments.find(payment => 
      payment.diner_name === dinerName && payment.payment_status === 'completed'
    );
  };

  // Process diners and calculate their bills using real participant names
  const processDiners = (orderItems: any[]) => {
    const dinerMap = new Map<string, Diner>();
    
    // First, collect all unique participant names from shared items
    const allParticipants = new Set<string>();
    
    orderItems.forEach(orderItem => {
        // Add the person who ordered it
        if (orderItem.diner_name) {
          allParticipants.add(orderItem.diner_name);
        }
        
        // Add all participants from shared items
      if (orderItem.split_bills && orderItem.split_bills.participants) {
        orderItem.split_bills.participants.forEach((participant: string) => {
            allParticipants.add(participant);
          });
        }
        
        // Also check shared_with array
        if (orderItem.shared_with && Array.isArray(orderItem.shared_with)) {
          orderItem.shared_with.forEach((participant: string) => {
            allParticipants.add(participant);
          });
        }
    });
    
    // Create diner entries for all participants
    for (const participantName of allParticipants) {
      if (participantName && typeof participantName === 'string' && participantName.trim()) {
        const name = participantName.trim();
        if (!dinerMap.has(name)) {
          const dinerName = name;
          dinerMap.set(dinerName, {
            id: dinerName.toLowerCase().replace(/\s+/g, '-'),
            name: dinerName,
            color: getDinerColor(dinerName as string),
            avatar: dinerName.charAt(0).toUpperCase(),
            orders: [],
            personalTotal: 0,
            sharedTotal: 0,
            total: 0
          } as Diner);
        }
      }
    }
    
    // Now process orders and assign them to the correct diners
    orderItems.forEach(orderItem => {
      const menuItem = Array.isArray(orderItem.menu_items) ? orderItem.menu_items[0] : orderItem.menu_items;
      const splitBill = Array.isArray(orderItem.split_bills) ? orderItem.split_bills[0] : orderItem.split_bills;
        const isShared = !!splitBill && splitBill.participants && splitBill.participants.length > 0;
        
        if (isShared && splitBill.participants) {
          // For shared items, add to all participants
          splitBill.participants.forEach((participantName: string) => {
            const diner = dinerMap.get(participantName);
            if (diner) {
              const itemPrice = (splitBill.split_price || 0) * orderItem.quantity;
              diner.orders.push({
                ...orderItem,
                itemPrice,
                isShared: true,
                sharedWith: splitBill.participants
              });
              diner.sharedTotal += itemPrice;
            }
          });
        } else {
        // For personal items, add to "You" since diner_name is null for personal orders
        const dinerName = orderItem.diner_name || 'You';
          const diner = dinerMap.get(dinerName);
          if (diner) {
            const itemPrice = (menuItem?.price || 0) * orderItem.quantity;
            diner.orders.push({
              ...orderItem,
              itemPrice,
              isShared: false
            });
            diner.personalTotal += itemPrice;
          }
        }
    });
    
    // Calculate totals for each diner (including VAT)
    dinerMap.forEach(diner => {
      const subtotal = diner.personalTotal + diner.sharedTotal;
      const vat = subtotal * 0.14; // 14% VAT
      diner.total = subtotal + vat;
    });
    
    setDiners(Array.from(dinerMap.values()));
  };

  // Get diner color
  const getDinerColor = (name: string | undefined) => {
    if (!name) return '#FF6B6B';
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98'];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Load data on mount
  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  // Auto-refresh every 30 seconds (background refresh)
  useEffect(() => {
    const interval = setInterval(() => loadSessionData(true), 30000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Generate payment notifications when payment status changes
  useEffect(() => {
    generatePaymentNotification();
  }, [session?.payment_status]);

  // Role detection - in a real app this would come from authentication
  useEffect(() => {
    // For demo purposes, detect role from URL or localStorage
    const savedRole = localStorage.getItem('staffRole') as 'kitchen' | 'waitstaff' | null;
    if (savedRole) {
      setUserRole(savedRole);
    } else {
      // Default to waitstaff for now, but show role selection
      setUserRole('waitstaff');
    }
  }, []);

  // Fetch available tables for transfer
  const fetchAvailableTables = async () => {
    try {
      const response = await fetch('/api/tables');
      const data = await response.json();
      
      if (data.success) {
        // Filter out the current table - all other tables are available for transfer
        // since we're only showing tables that don't have active sessions
        const available = data.data.filter((table: any) => 
          table.id !== session?.table_id
        );
        setAvailableTables(available);
      }
    } catch (error) {
      console.error('Error fetching available tables:', error);
    }
  };

  // Handle table transfer
  const handleTransferTable = async () => {
    if (!selectedDestinationTable || !session) {
      alert('Please select a destination table');
      return;
    }

    try {
      const response = await fetch('/api/tables/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceTableId: session.table_id,
          destinationTableId: selectedDestinationTable,
          sessionId: session.id
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Table transferred successfully to Table ${data.destinationTable?.table_number}!`);
        setShowTransferModal(false);
        setSelectedDestinationTable(null);
        // Refresh session details
        window.location.reload();
      } else {
        alert(data.error || 'Failed to transfer table');
      }
    } catch (error) {
      console.error('Error transferring table:', error);
      alert('Failed to transfer table');
    }
  };

  // Generate notification for order status changes
  const generateNotification = (order: OrderItem, newStatus: string) => {
    const tableNumber = session?.tables?.table_number || 'Unknown';
    const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
    const dinerName = order.diner_name || 'You';
    
    if (newStatus === 'ready') {
      const notification = {
        id: `ready-${order.id}-${Date.now()}`,
        type: 'ready' as const,
        message: `Table ${tableNumber} - ${menuItem?.name || 'Order'} ready for delivery (${dinerName})`,
        tableNumber,
        orderId: order.id,
        timestamp: new Date(),
        resolved: false
      };
      setNotifications(prev => [...prev, notification]);
      // Play audio notification for kitchen ready
      playSound('food-ready');
    }
  };

  // Generate payment request notification
  const generatePaymentNotification = () => {
    if (session?.payment_status === 'pending') {
      const tableNumber = session?.tables?.table_number || 'Unknown';
      const notification = {
        id: `payment-${session.id}-${Date.now()}`,
        type: 'payment' as const,
        message: `Table ${tableNumber} - Payment request received (P${session.final_total?.toFixed(2) || '0.00'})`,
        tableNumber,
        timestamp: new Date(),
        resolved: false
      };
      setNotifications(prev => {
        // Remove any existing payment notifications for this session
        const filtered = prev.filter(n => !(n.type === 'payment' && n.tableNumber === tableNumber));
        return [...filtered, notification];
      });
      // Play audio notification for payment request
      playSound('payment-request');
    }
  };

  // Mark notification as resolved
  const resolveNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Handle payment processing
  const handleProcessPayment = (diner?: Diner) => {
    if (!session) return;
    
    if (diner) {
      // Individual payment
      setPaymentType('individual');
      setPaymentAmount(diner.total);
      setSelectedDiner(diner);
    } else {
      // Table payment
      setPaymentType('table');
      setPaymentAmount(tableTotal);
      setSelectedDiner(null);
    }
    
    setShowPaymentModal(true);
  };

  // Handle payment confirmation
  const handlePaymentConfirmed = async (paymentMethod: string) => {
    if (!session) return;
    
    setIsProcessingPayment(true);
    
    try {
      // Determine if this is an individual or table payment
      const isIndividualPayment = selectedDiner !== null;
      const dinerName = isIndividualPayment ? selectedDiner.name : null;
      
      const response = await fetch('/api/payment/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          paymentMethod: paymentMethod,
          completedBy: userRole === 'kitchen' ? 'Kitchen Staff' : 'Waitstaff',
          paymentType: isIndividualPayment ? 'individual' : 'table',
          dinerName: dinerName,
          paymentAmount: paymentAmount
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to complete payment');
      }

      // Show success message
      const paymentTypeText = isIndividualPayment ? `${dinerName}'s individual payment` : 'table payment';
      alert(`${paymentTypeText} completed successfully using ${paymentMethod}!`);
      
      // Reload session data to reflect changes
      await loadSessionData();
      
      // Close modal
      setShowPaymentModal(false);
      setSelectedDiner(null);
      
    } catch (error) {
      console.error('Error completing payment:', error);
      alert(`Failed to complete payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };


  // Update order status
  const updateOrderStatus = async (orderItemId: string, newStatus: 'preparing' | 'ready' | 'served') => {
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

      // Generate notification for ready status
      if (newStatus === 'ready') {
        const order = orders.find(o => o.id === orderItemId);
        if (order) {
          generateNotification(order, newStatus);
        }
      }

      // Reload data to reflect changes
      await loadSessionData();
      
    } catch (error) {
      console.error('Error updating order status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  // Get status color and icon
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'preparing':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="w-4 h-4" />,
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
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Served'
        };
      default:
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: <ChefHat className="w-4 h-4" />,
          text: 'Ordered'
        };
    }
  };

  // Get action button for order item
  const getActionButton = (item: OrderItem) => {
    // Role-based status changes
    const canChangeToPreparing = userRole === 'kitchen' && item.status === 'waiting';
    const canChangeToReady = userRole === 'kitchen' && item.status === 'preparing';
    const canChangeToServed = userRole === 'waitstaff' && item.status === 'ready';

    switch (item.status) {
      case 'preparing':
        if (canChangeToReady) {
        return (
          <button
            onClick={() => updateOrderStatus(item.id, 'ready')}
            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Mark Ready
          </button>
        );
        }
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
            Kitchen: Preparing
          </span>
        );
      
      case 'ready':
        if (canChangeToServed) {
        return (
          <button
            onClick={() => updateOrderStatus(item.id, 'served')}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Mark Served
          </button>
        );
        }
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
            {userRole === 'waitstaff' ? 'Ready for Delivery' : 'Kitchen: Ready'}
          </span>
        );
      
      case 'served':
        return (
          <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-sm">
            Served
          </span>
        );
      
      default: // waiting, submitted, etc.
        if (canChangeToPreparing) {
        return (
          <button
            onClick={() => updateOrderStatus(item.id, 'preparing')}
            className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
          >
            Start Cooking
          </button>
          );
        }
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm">
            {userRole === 'kitchen' ? 'Waiting for Kitchen' : 'Waiting for Kitchen'}
          </span>
        );
    }
  };

  // Calculate table totals - use original prices for all items
  const tableSubtotal = orders.reduce((sum, order) => {
    const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
    const price = menuItem?.price || 0;
    return sum + (price * order.quantity);
  }, 0);
  
  const tableVat = tableSubtotal * 0.14;
  const tableTotal = tableSubtotal + tableVat;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Session</h3>
          <p className="text-gray-600 mb-4">{error || 'Session not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#00d9ff] text-white rounded-lg hover:bg-[#00c4e6] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                  <span>Table {session.tables.table_number}</span>
                  {session.tables.current_pin ? (
                    <span className="text-sm font-mono bg-blue-100 text-blue-800 px-3 py-1 rounded-lg border border-blue-200">
                      PIN: {session.tables.current_pin}
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/tables/assign-pin', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              tableId: session.tables.id
                            })
                          });
                          
                          const data = await response.json();
                          if (data.success) {
                            // Refresh the session data to show the new PIN
                            window.location.reload();
                          } else {
                            alert(data.error || 'Failed to assign PIN');
                          }
                        } catch (error) {
                          console.error('Error assigning PIN:', error);
                          alert('Failed to assign PIN');
                        }
                      }}
                      className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-lg border border-orange-200 hover:bg-orange-200 transition-colors"
                    >
                      Assign PIN
                    </button>
                  )}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    session.payment_status === 'pending' 
                      ? 'bg-red-100 text-red-800 animate-pulse' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {session.payment_status === 'pending' ? '💳 Payment Requested' : 'Active Session'}
                  </span>
                  <span className="text-sm text-gray-600">
                    {diners.length} guest{diners.length !== 1 ? 's' : ''}
                    {isRefreshing && (
                      <span className="ml-2 text-xs text-blue-500">
                        <RefreshCw className="w-3 h-3 inline animate-spin mr-1" />
                        Updating...
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Audio Settings */}
              <AudioSettings />
              
              {/* Role Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Role:</span>
                <select
                  value={userRole}
                  onChange={(e) => {
                    const newRole = e.target.value as 'kitchen' | 'waitstaff';
                    setUserRole(newRole);
                    localStorage.setItem('staffRole', newRole);
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent"
                >
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="waitstaff">Waitstaff</option>
                </select>
              </div>
              
              <button
                onClick={() => loadSessionData(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh session"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setShowTransferModal(true);
                  fetchAvailableTables();
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Transfer Table</span>
              </button>
              <button
                onClick={() => setShowAdjustModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Adjust Bill</span>
              </button>
            </div>
          </div>
        </div>

        {/* Diner List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Diner List
          </h3>
          <div className="flex flex-wrap gap-3">
            {diners.map((diner) => (
              <div
                key={diner.id}
                className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: diner.color }}
                >
                  {diner.avatar}
                </div>
                <span className="font-medium text-gray-900">{diner.name}</span>
                <span className="text-sm text-gray-600">
                  P{diner.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>


        {/* Tabs - Matching Customer Live Bill Design */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            {/* View Toggle - Exact same design as customer Live Bill */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                onClick={() => setActiveTab('table')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'table'
                    ? 'bg-[#00d9ff] text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Table Bill
              </button>
              <button
                onClick={() => setActiveTab('individual')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'individual'
                    ? 'bg-[#00d9ff] text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Individual Splits
              </button>
            </div>
            {activeTab === 'table' ? (
              /* Table Bill Tab */
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Receipt className="w-5 h-5 mr-2" />
                  Order Summary
                </h3>
                
                <div className="space-y-6 mb-6">
                  {orders.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-gray-400 mb-4">
                        <Receipt className="w-16 h-16 mx-auto" />
                      </div>
                      <p className="text-gray-500 text-lg mb-2">No orders yet</p>
                      <p className="text-gray-400 text-sm">Orders will appear here once customers start placing them</p>
                    </div>
                  ) : (
                    <>
                      {/* Personal Items First */}
                      {orders.filter(order => {
                        const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
                        return !splitBill || !splitBill.participants || splitBill.participants.length === 0;
                      }).length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <User className="w-4 h-4 mr-2 text-green-600" />
                        Personal Items
                      </h4>
                      <div className="space-y-3">
                        {orders.filter(order => {
                          const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
                          return !splitBill || !splitBill.participants || splitBill.participants.length === 0;
                        }).map((order) => {
                          const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
                    const statusStyle = getStatusStyle(order.status);
                    const orderedBy = order.diner_name || 'Unknown';
                    
                    return (
                      <div
                        key={order.id}
                              className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-gray-900">
                              {menuItem?.name || 'Unknown Item'}
                            </h4>
                            <span className="text-sm text-gray-600">
                              P{(menuItem?.price || 0).toFixed(2)} × {order.quantity}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm text-gray-600">
                                Ordered by: {orderedBy}
                              </span>
                                  {order.notes && (
                                    <span className="text-sm text-blue-600">
                                      Note: {order.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${statusStyle.color}`}>
                                  {statusStyle.icon}
                                  <span>{statusStyle.text}</span>
                                </div>
                                {getActionButton(order)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Shared Items Second */}
                  {orders.filter(order => {
                    const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
                    return !!splitBill && splitBill.participants && splitBill.participants.length > 0;
                  }).length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-blue-600" />
                        Shared Items
                      </h4>
                      <div className="space-y-3">
                        {orders.filter(order => {
                          const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
                          return !!splitBill && splitBill.participants && splitBill.participants.length > 0;
                        }).map((order) => {
                          const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
                          const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
                          const statusStyle = getStatusStyle(order.status);
                          const sharedBy = splitBill.participants ? splitBill.participants.join(', ') : null;
                          
                          return (
                            <div
                              key={order.id}
                              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <h4 className="font-medium text-gray-900">
                                    {menuItem?.name || 'Unknown Item'}
                                  </h4>
                                  <span className="text-sm text-gray-600">
                                    P{(menuItem?.price || 0).toFixed(2)} × {order.quantity}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="text-sm text-gray-600">
                                    Shared by: {sharedBy}
                                  </span>
                            {order.notes && (
                              <span className="text-sm text-blue-600">
                                Note: {order.notes}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${statusStyle.color}`}>
                            {statusStyle.icon}
                            <span>{statusStyle.text}</span>
                          </div>
                          {getActionButton(order)}
                        </div>
                      </div>
                    );
                  })}
                      </div>
                    </div>
                  )}

                {/* Bill Summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Bill Summary</h4>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-medium text-gray-900">P{tableSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">VAT (14%):</span>
                      <span className="font-medium text-gray-900">P{tableVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-[#00d9ff]">P{tableTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleProcessPayment()}
                    className={`py-2 px-4 rounded-lg transition-colors font-medium text-sm ${
                      session.payment_status === 'pending' 
                        ? 'bg-[#00d9ff] text-white hover:bg-[#00c4e6] cursor-pointer' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={session.payment_status !== 'pending' || isProcessingPayment}
                    title={session.payment_status !== 'pending' ? 'No payment request pending' : 'Process full payment request'}
                  >
                    {isProcessingPayment ? 'Processing...' : (session.payment_status === 'pending' ? 'Process Full Payment' : 'No Payment Request')}
                  </button>
                  {session.payment_status !== 'pending' && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Wait for customer to request payment
                    </p>
                  )}
                </div>
                    </>
                  )}
                </div>
              </div>
            ) : activeTab === 'individual' ? (
              /* Individual Splits Tab */
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Individual Splits
                </h3>
                
                <div className="space-y-6">
                  {diners.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-gray-400 mb-4">
                        <Users className="w-16 h-16 mx-auto" />
                      </div>
                      <p className="text-gray-500 text-lg mb-2">No individual splits yet</p>
                      <p className="text-gray-400 text-sm">Individual payment splits will appear here once customers start sharing items</p>
                    </div>
                  ) : (
                    diners.map((diner) => (
                    <div
                      key={diner.id}
                      className="border-2 border-[#00d9ff] rounded-lg p-6"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: diner.color }}
                        >
                          {diner.avatar}
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {diner.name}'s Bill
                        </h4>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        {/* Personal Items First */}
                        {diner.orders.filter(item => !item.isShared).length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                              <User className="w-4 h-4 mr-1 text-green-600" />
                              Personal Items:
                            </h5>
                            {diner.orders.filter(item => !item.isShared).map((item) => {
                              const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
                              return (
                                <div key={item.id} className="flex justify-between text-sm text-gray-700 bg-green-50 p-2 rounded border border-green-200">
                                  <span className="text-gray-800">{menuItem?.name || 'Unknown Item'} × {item.quantity}</span>
                                  <span className="font-medium text-gray-900">P{(item.itemPrice || 0).toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Shared Items Second */}
                        {diner.orders.filter(item => item.isShared).length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                              <Users className="w-4 h-4 mr-1 text-blue-600" />
                              Shared Items:
                            </h5>
                            {diner.orders.filter(item => item.isShared).map((item) => {
                              const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
                              const splitBill = Array.isArray(item.split_bills) ? item.split_bills[0] : item.split_bills;
                              return (
                                <div key={item.id} className="flex justify-between text-sm text-gray-700 bg-blue-50 p-2 rounded border border-blue-200">
                                  <span className="text-gray-800">
                                    {menuItem?.name || 'Unknown Item'} split {splitBill?.split_count} ways × {item.quantity}
                                  </span>
                                  <span className="font-medium text-gray-900">P{(item.itemPrice || 0).toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t border-gray-200 pt-3">
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-700">Subtotal:</span>
                            <span className="font-medium text-gray-900">P{(diner.personalTotal + diner.sharedTotal).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">VAT (14%):</span>
                            <span className="font-medium text-gray-900">P{((diner.personalTotal + diner.sharedTotal) * 0.14).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg">
                            <span className="text-gray-900">Total:</span>
                            <span className="text-[#00d9ff]">P{diner.total.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {hasDinerPaid(diner.name) ? (
                          <div className="w-full mt-3 py-2 px-4 rounded-lg bg-green-100 border border-green-300">
                            <div className="text-center">
                              <div className="text-green-800 font-medium text-sm">✅ Payment Completed</div>
                              {(() => {
                                const paymentInfo = getDinerPaymentInfo(diner.name);
                                return paymentInfo ? (
                                  <div className="text-green-600 text-xs mt-1">
                                    {paymentInfo.payment_method} • {new Date(paymentInfo.completed_at).toLocaleTimeString()}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleProcessPayment(diner)}
                            className={`w-full mt-3 py-2 px-4 rounded-lg transition-colors font-medium text-sm ${
                              session.payment_status === 'pending' || session.payment_status === 'partial'
                                ? 'bg-[#00d9ff] text-white hover:bg-[#00c4e6] cursor-pointer' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            disabled={(session.payment_status !== 'pending' && session.payment_status !== 'partial') || isProcessingPayment}
                            title={(session.payment_status !== 'pending' && session.payment_status !== 'partial') ? 'No payment request pending' : 'Process payment request'}
                          >
                            {isProcessingPayment ? 'Processing...' : ((session.payment_status === 'pending' || session.payment_status === 'partial') ? 'Process Payment' : 'No Payment Request')}
                          </button>
                        )}
                        {session.payment_status !== 'pending' && (
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            Wait for customer to request payment
                          </p>
                        )}
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Transfer Table Modal */}
      {showTransferModal && session && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Transfer Table {session.tables.table_number}
                </h2>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedDestinationTable(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* Current Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">Current Status:</div>
                  <div>Moving from: <span className="font-semibold">Table {session.tables.table_number}</span></div>
                  <div className="text-xs text-blue-600 mt-1">
                    Current bill: P{session.final_total?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>

              {/* Destination Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select new table:
                </label>
                {availableTables.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {availableTables.map((table) => (
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
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No available tables found.</p>
                    <p className="text-sm mt-2">All tables are currently occupied.</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedDestinationTable(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferTable}
                  disabled={!selectedDestinationTable}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    selectedDestinationTable 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Bill Modal */}
      {showAdjustModal && session && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Adjust Bill for Table {session.tables.table_number}
                </h2>
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    setManagerPin('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Manager Authentication */}
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        if (managerPin === '1234') { // Simple demo PIN
                          alert('Manager authenticated! Adjust bill functionality will be implemented here.');
                          setShowAdjustModal(false);
                          setManagerPin('');
                        } else {
                          alert('Invalid manager PIN');
                        }
                      }
                    }}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowAdjustModal(false);
                      setManagerPin('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (managerPin === '1234') { // Simple demo PIN
                        alert('Manager authenticated! Adjust bill functionality will be implemented here.');
                        setShowAdjustModal(false);
                        setManagerPin('');
                      } else {
                        alert('Invalid manager PIN');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Authenticate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      <PaymentProcessingModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedDiner(null);
        }}
        paymentAmount={paymentAmount}
        paymentType={paymentType}
        onPaymentConfirmed={handlePaymentConfirmed}
      />
    </div>
  );
}
