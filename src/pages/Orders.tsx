import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { API_BASE_URL } from "@/services/url";
import {
  Home, Search, Download, ChevronDown,
  PlusCircle, CheckCircle, Truck, X, Edit, Trash2,
  Filter, Clock, Check, Truck as TruckIcon,
  MoreVertical, Inbox, ChevronLeft, ChevronRight,
  Wallet, CreditCard, XCircle,
  FileText, FileSpreadsheet, Printer, Loader2, EllipsisVertical,
  MessageSquare, Send, Calendar, Phone,
  Database, AlertCircle
} from 'lucide-react';
import { Customer, Order, OrderItem, User } from "@/services/types";
import { ROUTES } from "@/services/Routes";

export const ORDERS_URL = `${API_BASE_URL}/Laundry/orders/`;
export const SEND_SMS_URL = `${API_BASE_URL}/Laundry/send-sms/`;
const CURRENT_USER_URL = `${API_BASE_URL}/users/me/`;


// --- Constants & Types ---

const STATUS_COLORS: { [key: string]: { bg: string; text: string; icon: any } } = {
  'Completed': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
  'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  'Delivered_picked': { bg: 'bg-purple-100', text: 'text-purple-800', icon: TruckIcon },
};

const PAYMENT_STATUS_COLORS: { [key: string]: { bg: string; text: string; icon: any } } = {
  'completed': { bg: 'bg-green-100', text: 'text-green-800', icon: Check },
  'partial': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  'pending': { bg: 'bg-red-100', text: 'text-red-800', icon: Clock },
};

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  current_page?: number;
  total_pages?: number;
  page_size?: number;
}

interface PaginatedOrdersResponse extends PaginatedResponse<Order> {
  results: Order[];
}

interface FilterState {
  searchQuery: string;
  paymentFilter: string;
  shopFilter: string;
  orderStatusFilter: string;
  dateFilter: { startDate: string; endDate: string };
}

// --- Helper Functions (Outside Component) ---

const getAuthToken = (): string | null => localStorage.getItem("accessToken");

const formatCurrency = (amount?: string | number | null): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount ?? 0);
  if (!Number.isFinite(numAmount)) return 'KSh 0.00';
  return `KSh ${numAmount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthDateRange = (year: number, monthIndex: number) => ({
  startDate: getLocalDateString(new Date(year, monthIndex, 1)),
  endDate: getLocalDateString(new Date(year, monthIndex + 1, 0)),
});

const getCurrentMonthDateRange = () => {
  const now = new Date();
  return getMonthDateRange(now.getFullYear(), now.getMonth());
};

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const calculateDaysSince = (dateString: string): number => {
  const orderDate = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - orderDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const orderCreatedTime = (order: Order): number => {
  const timestamp = new Date(order.created_at || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const sortOrdersNewestFirst = (orders: Order[]): Order[] => {
  return [...orders].sort((a, b) => {
    const dateDiff = orderCreatedTime(b) - orderCreatedTime(a);
    if (dateDiff !== 0) return dateDiff;
    return Number(b.id || 0) - Number(a.id || 0);
  });
};

const formatListValue = (value: unknown): string => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String).join(', ');
  return value ? String(value) : 'N/A';
};

const formatServiceType = (servicetype: unknown): string => formatListValue(servicetype);

const displayOrderCode = (order: Order): string => {
  return order.uniquecode || `ORD-${Number(order.id || 0).toString(16).toUpperCase().padStart(5, '0').slice(-5)}`;
};

const getUserFullName = (order: Order): string => {
  if (order.created_by) {
    const firstName = order.created_by.first_name || '';
    const lastName = order.created_by.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
  }
  return 'Unknown';
};

const getOrderCustomer = (order: Order): Customer => (
  order.customer || { id: 0, name: 'Unknown', phone: '' }
);

const getOrderItems = (order: Order): OrderItem[] => (
  Array.isArray(order.items) ? order.items : []
);

const apiFetch = async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    const errorText = await response.text();
    console.error(`API Error ${response.status}:`, errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// --- Components ---

const SMSDialogModal = ({
  selectedOrders,
  allOrders = [],
  onSend,
  onClose,
  loadAllOrders,
  loadingAll,
  currentFilters
}: {
  selectedOrders: Order[],
  allOrders?: Order[],
  onSend: (message: string, recipients: Order[]) => Promise<void>,
  onClose: () => void,
  loadAllOrders?: () => Promise<void>,
  loadingAll?: boolean,
  currentFilters?: FilterState
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [useAllOrders, setUseAllOrders] = useState(false);

  const ordersToUse = useAllOrders ? allOrders : selectedOrders;

  const handleSend = async () => {
    if (!message.trim()) return alert('Please enter a message');
    setSending(true);
    try {
      await onSend(message, ordersToUse);
    } finally {
      setSending(false);
    }
  };

  const generateDefaultMessage = () => {
    const orders = ordersToUse.slice(0, 3);
    const customerNames = orders.map(order => getOrderCustomer(order).name.split(' ')[0]);
    const nameList = customerNames.join(', ');
    const extra = ordersToUse.length > 3 ? ` and ${ordersToUse.length - 3} others` : '';
    return `Dear ${nameList}${extra}, this is a friendly reminder about your pending laundry order. Please visit us to collect your items. Thank you!`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Send SMS to Customers
          </h2>
        </div>
        <div className="p-6">
          {currentFilters && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-blue-800 mb-1">Current Filters:</p>
              <div className="flex flex-wrap gap-1">
                {currentFilters.searchQuery && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Search: {currentFilters.searchQuery}</span>}
                {currentFilters.paymentFilter && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Payment: {currentFilters.paymentFilter}</span>}
                {currentFilters.orderStatusFilter && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Status: {currentFilters.orderStatusFilter}</span>}
                {currentFilters.dateFilter.startDate && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">From: {currentFilters.dateFilter.startDate}</span>}
                {currentFilters.dateFilter.endDate && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">To: {currentFilters.dateFilter.endDate}</span>}
              </div>
            </div>
          )}

          {allOrders.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAllOrders}
                  onChange={(e) => setUseAllOrders(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`relative w-11 h-6 bg-gray-200 rounded-full transition-colors duration-200 peer-checked:bg-green-500`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5`}></div>
                </div>
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">Send to all {allOrders.length} filtered orders</span>
                </div>
              </label>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
              placeholder="Type your message here..."
              maxLength={160}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">{message.length}/160 characters</span>
              <button type="button" onClick={() => setMessage(generateDefaultMessage())} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Use Default Reminder</button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recipients ({ordersToUse.length})</label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
              {ordersToUse.slice(0, 10).map((order) => (
                <div key={order.id} className="px-4 py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">{getOrderCustomer(order).name}</span>
                    <span className={`text-xs font-medium ${order.balance === '0.00' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {order.balance === '0.00' ? 'Paid' : `Bal: ${order.balance}`}
                    </span>
                  </div>
                </div>
              ))}
              {ordersToUse.length > 10 && <div className="px-4 py-2 text-center text-xs text-gray-500">...and {ordersToUse.length - 10} more</div>}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} disabled={sending} className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
            <button onClick={handleSend} disabled={sending || !message.trim()} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send SMS</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Orders() {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [paymentType, setPaymentType] = useState('cash');
  const [currentUser, setCurrentUser] = useState<User | null>(null);


  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    paymentFilter: '',
    shopFilter: '',
    orderStatusFilter: '',
    dateFilter: getCurrentMonthDateRange()
  });

  // Pagination State
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20,
    next: null as string | null,
    previous: null as string | null
  });

  // Stats State
  const [stats, setStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    delivered_orders: 0,
    total_revenue: 0,
    pending_revenue: 0,
    completed_revenue: 0,
  });
  const fetchCurrentUser = useCallback(async () => {
  try {
    const user = await apiFetch<User>(CURRENT_USER_URL);
    setCurrentUser(user);
  } catch (err) {
    console.error("Failed to fetch current user", err);
  }
}, []);
useEffect(() => {
  fetchCurrentUser();
}, [fetchCurrentUser]);

const currentUserName = useMemo(() => {
  if (!currentUser) return "Unknown";
  return `${currentUser.first_name} ${currentUser.last_name}`.trim();
}, [currentUser]);



  // Fetch stats from backend summary endpoint
  const fetchStats = useCallback(async () => {
    try {
      const params = buildQueryParams();
      const response = await apiFetch<{ total_orders: number, total_revenue: number, pending_orders: number, completed_orders: number, pending_revenue: number, completed_revenue: number, shop_breakdown: any[] }>(`${ORDERS_URL}summary/?${params.toString()}`);
      setStats({
        total_orders: response.total_orders,
        pending_orders: response.pending_orders,
        completed_orders: response.completed_orders,
        delivered_orders: 0, // Not in summary, can add if needed
        total_revenue: response.total_revenue,
        pending_revenue: response.pending_revenue,
        completed_revenue: response.completed_revenue,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Fallback to local calculation if summary fails
      if (orders.length > 0) {
        const computedStats = calculateLocalStats(orders);
        setStats(prev => ({ ...prev, ...computedStats }));
      }
    }
  }, [filters, orders]);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Derived State
  const selectedOrderObjects = useMemo(() =>
    orders.filter(order => selectedOrders.has(order.id)),
    [orders, selectedOrders]);

  const selectedMonth = filters.dateFilter.startDate
    ? new Date(`${filters.dateFilter.startDate}T00:00:00`).getMonth()
    : new Date().getMonth();

  const selectedYear = filters.dateFilter.startDate
    ? new Date(`${filters.dateFilter.startDate}T00:00:00`).getFullYear()
    : new Date().getFullYear();

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => currentYear - 5 + index);
  }, []);

  // --- Local Stats Calculator ---
  const calculateLocalStats = (orderList: Order[]) => {
    const totalRevenue = orderList.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0);
    const pendingOrders = orderList.filter(o => o.order_status === 'pending');
    const completedOrders = orderList.filter(o => o.order_status === 'Completed');

    return {
      pending_orders: pendingOrders.length,
      completed_orders: completedOrders.length,
      delivered_orders: orderList.filter(o => o.order_status === 'Delivered_picked').length,
      total_revenue: totalRevenue,
      pending_revenue: pendingOrders.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0),
      completed_revenue: completedOrders.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0),
    };
  };

  // --- Query Builder Helper ---
  const buildQueryParams = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams();

    if (filters.searchQuery.trim()) {
      params.set("search", filters.searchQuery.trim());
    }

    if (filters.paymentFilter) {
      params.set("payment_status", filters.paymentFilter);
    }

    if (filters.orderStatusFilter) {
      params.set("order_status", filters.orderStatusFilter);
    }

    if (filters.shopFilter) {
      params.set("shop", filters.shopFilter);
    }

    if (filters.dateFilter.startDate) {
      params.set(
        "created_at__date__gte",
        filters.dateFilter.startDate
      );
    }

    if (filters.dateFilter.endDate) {
      params.set(
        "created_at__date__lte",
        filters.dateFilter.endDate
      );
    }

    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params;
  };


  // --- API Calls ---

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = buildQueryParams({
        page: page.toString(),
        page_size: pagination.pageSize.toString()
      });

      console.log('Fetching orders with params:', params.toString());
      const response = await apiFetch<PaginatedOrdersResponse>(`${ORDERS_URL}?${params.toString()}`);

      if (!response.results || !Array.isArray(response.results)) throw new Error('Invalid response format');

      setOrders(sortOrdersNewestFirst(response.results));

      const totalItems = response.count || 0;
      const totalPages = response.total_pages || Math.ceil(totalItems / pagination.pageSize) || 1;
      const currentPage = response.current_page || page;

      setPagination({
        currentPage,
        totalPages,
        totalItems,
        pageSize: response.page_size || pagination.pageSize,
        next: response.next,
        previous: response.previous
      });

    } catch (err: any) {
      console.error("Error fetching orders:", err);
      if (err.message === "Unauthorized") {
        setError("Session expired. Please login again.");
        window.location.href = ROUTES.login;
      } else {
        setError(err.message);
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize]);

  const fetchAllOrders = useCallback(async () => {
    setLoadingAll(true);
    try {
      let allOrdersData: Order[] = [];
      let nextUrl: string | null = `${ORDERS_URL}?${buildQueryParams({ page_size: '100' }).toString()}`;

      while (nextUrl) {
        const response = await apiFetch<PaginatedOrdersResponse>(nextUrl);
        allOrdersData = [...allOrdersData, ...response.results];
        nextUrl = response.next;
        if (allOrdersData.length > 2000) break;
      }
      setAllOrders(sortOrdersNewestFirst(allOrdersData));
    } catch (err) {
      console.error("Error fetching all orders:", err);
      alert('Could not load all orders for SMS.');
    } finally {
      setLoadingAll(false);
    }
  }, [filters]);

  // --- Effects ---

  useEffect(() => {
    fetchOrders(1);
    setAllOrders([]);
  }, [fetchOrders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
      const clickedOutsideAllDropdowns = Object.values(dropdownRefs.current).every(
        ref => ref && !ref.contains(event.target as Node)
      );
      if (clickedOutsideAllDropdowns) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Handlers ---

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchOrders(1);
    }, 500);
  };

  const applyDateFilter = () => {
    fetchOrders(1);
  };

  const clearDateFilter = () => {
    setFilters(prev => ({ ...prev, dateFilter: { startDate: '', endDate: '' } }));
  };

  const applyCurrentMonthFilter = () => {
    setFilters(prev => ({ ...prev, dateFilter: getCurrentMonthDateRange() }));
  };

  const applyMonthYearFilter = (year: number, monthIndex: number) => {
    setFilters(prev => ({ ...prev, dateFilter: getMonthDateRange(year, monthIndex) }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchQuery: '',
      paymentFilter: '',
      shopFilter: '',
      orderStatusFilter: '',
      dateFilter: getCurrentMonthDateRange()
    });
  };

  const handleExport = (format: string) => {
    const params = buildQueryParams({ export: format });
    const url = `${ORDERS_URL}?${params.toString()}`;
    const exportWindow = window.open('', '_blank');
    if (exportWindow) exportWindow.location.href = url;
    setShowExportDropdown(false);
  };

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) newSet.delete(orderId);
      else newSet.add(orderId);
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(orders.map(o => o.id)));
      setShowBulkActions(true);
    } else {
      setSelectedOrders(new Set());
      setShowBulkActions(false);
    }
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
    setShowBulkActions(false);
  };

  const sendBulkSMS = async (message: string, recipients: Order[]) => {
    if (!confirm(`Are you sure you want to send SMS to ${recipients.length} customers?`)) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error('Unauthorized');

      const phoneNumbers = [...new Set(recipients.map(order => getOrderCustomer(order).phone).filter(Boolean))];

      console.log('Sending bulk SMS to:', phoneNumbers.length, 'recipients');

      const res = await fetch(SEND_SMS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ to_number: phoneNumbers, message })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('SMS API Error:', errorText);
        throw new Error(`Failed to send SMS: ${res.status}`);
      }

      const result = await res.json();
      console.log('SMS Result:', result);
      alert(`SMS sent successfully to ${phoneNumbers.length} customer(s)!`);
      setShowSMSModal(false);
      clearSelection();
      setAllOrders([]);
    } catch (err) {
      console.error(err);
      alert('Failed to send SMS. Please try again.');
    }
  };

  // --- Inline Helpers for Modals ---
  const updateOrderStatus = async (orderId: number, status: Order['order_status']) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ORDERS_URL}${orderId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
        body: JSON.stringify({ order_status: status })
      });
      if (!res.ok) throw new Error('Failed to update');

      fetchOrders(pagination.currentPage);
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const deleteOrder = async (orderId: number, orderCode: string) => {
    if (!confirm(`Delete order ${orderCode}?`)) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`${ORDERS_URL}${orderId}/`, {
        method: 'DELETE',
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });
      if (res.ok) {
        fetchOrders(pagination.currentPage);
        if (selectedOrders.has(orderId)) toggleOrderSelection(orderId);
      }
    } catch (err) {
      alert('Failed to delete order');
    }
  };

  const handleBulkAction = async (status: 'Completed' | 'Delivered_picked') => {
    if (!confirm(`Mark ${selectedOrders.size} orders as ${status}?`)) return;
    for (const id of selectedOrders) {
      await updateOrderStatus(id, status);
    }
    clearSelection();
  };

  // --- Render Helpers ---
  const renderPageNumbers = () => {
    const { totalPages, currentPage } = pagination;
    if (totalPages <= 1) return null;

    const pages = [];
    const showEllipsis = totalPages > 5;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((p, i) => (
      p === '...' ?
        <span key={i} className="px-3 py-1 text-gray-500">...</span> :
        <button
          key={i}
          onClick={() => fetchOrders(p as number)}
          className={`px-3 py-1 text-sm font-medium rounded-md ${currentPage === p ? 'bg-blue-600 text-white' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}
        >
          {p}
        </button>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          

          <div className="flex-grow max-w-3xl relative">
            <input
              type="text"
              placeholder="Search orders..."
              value={filters.searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>

          {/* Date Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Period:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => applyMonthYearFilter(selectedYear, Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {MONTH_OPTIONS.map((month, index) => (
                  <option key={month} value={index}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => applyMonthYearFilter(Number(e.target.value), selectedMonth)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <input
                type="date"
                value={filters.dateFilter.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFilter: { ...prev.dateFilter, startDate: e.target.value } }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="date"
                value={filters.dateFilter.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFilter: { ...prev.dateFilter, endDate: e.target.value } }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button onClick={applyDateFilter} className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600">Apply</button>
              <button onClick={applyCurrentMonthFilter} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">This Month</button>
              <button onClick={clearDateFilter} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">All Dates</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={exportDropdownRef}>
              <button onClick={() => setShowExportDropdown(!showExportDropdown)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all">
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg py-2 z-20 w-48 border border-gray-100">
                  <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"><FileText className="w-4 h-4 text-green-600" /> CSV</button>
                  <button onClick={() => handleExport('xlsx')} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"><FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel</button>
                </div>
              )}
            </div>
            <button onClick={() => window.location.href = '/create-order'} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all">
              <PlusCircle className="w-4 h-4" /> <span>New Order</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">{selectedOrders.size} order(s) selected</span>
            <button onClick={() => { setAllOrders([]); setShowSMSModal(true); }} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center"><Send className="w-4 h-4 mr-2" /> Send SMS</button>
            <button onClick={() => handleBulkAction('Completed')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center"><CheckCircle className="w-4 h-4 mr-2" /> Mark Completed</button>
            <button onClick={() => handleBulkAction('Delivered_picked')} className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 flex items-center"><Truck className="w-4 h-4 mr-2" /> Mark Delivered</button>
            <button onClick={clearSelection} className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center"><XCircle className="w-4 h-4 mr-2" /> Clear</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl m-2"><Database className="text-blue-600 w-6 h-6" /></div>
              <div>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.total_orders}</h3>
                <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                <p className="text-xs text-blue-600 font-medium mt-1">{formatCurrency(stats.total_revenue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-amber-100 rounded-xl m-2"><Clock className="text-amber-600 w-6 h-6" /></div>
              <div>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.pending_orders}</h3>
                <p className="text-sm text-gray-500 font-medium">Pending Orders</p>
                <p className="text-xs text-amber-600 font-medium mt-1">{formatCurrency(stats.pending_revenue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl m-2"><CheckCircle className="text-green-600 w-6 h-6" /></div>
              <div>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.completed_orders}</h3>
                <p className="text-sm text-gray-500 font-medium">Completed Orders</p>
                <p className="text-xs text-green-600 font-medium mt-1">{formatCurrency(stats.completed_revenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-3">
          <button onClick={clearAllFilters} className={`px-4 py-2 text-sm font-medium rounded-md ${!filters.orderStatusFilter && !filters.paymentFilter && !filters.shopFilter && !filters.searchQuery ? 'bg-blue-600 text-white' : 'bg-blue-100 text-gray-700'}`}>Current Month</button>

          <select value={filters.shopFilter} onChange={(e) => { setFilters(prev => ({ ...prev, shopFilter: e.target.value })) }} className="border border-gray-300 rounded-md p-2 text-sm">
            <option value="">All Shops</option>
            <option value="Shop A">Shop A</option>
            <option value="Shop B">Shop B</option>
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">Order Status:</span>
            {['pending', 'Completed', 'Delivered_picked'].map(status => (
              <button key={status} onClick={() => { setFilters(prev => ({ ...prev, orderStatusFilter: prev.orderStatusFilter === status ? '' : status })); }} className={`px-3 py-1.5 rounded-full text-sm font-medium ${filters.orderStatusFilter === status ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{status === 'Delivered_picked' ? 'Delivered' : status}</button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">Payment:</span>
            {['pending', 'completed', 'partial'].map(status => (
              <button key={status} onClick={() => { setFilters(prev => ({ ...prev, paymentFilter: prev.paymentFilter === status ? '' : status })); }} className={`px-3 py-1.5 rounded-full text-sm font-medium ${filters.paymentFilter === status ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{status}</button>
            ))}
          </div>

          <div className="ml-auto text-sm text-gray-600">Showing {orders.length} of {pagination.totalItems} orders</div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl overflow-hidden shadow-lg">
          {loading ? <div className="text-center p-8"><Loader2 className="animate-spin w-8 h-8 text-blue-500 mx-auto" /></div> :
            error ? <div className="text-center p-8 text-red-500">{error}</div> :
              orders.length === 0 ? <div className="text-center p-8"><Inbox className="w-12 h-12 text-gray-300 mx-auto mb-2" /><p className="text-gray-500">No orders found</p></div> :
                (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="w-12 py-4 px-4 text-center font-semibold text-gray-700 text-xs uppercase"><input type="checkbox" checked={orders.length > 0 && selectedOrders.size === orders.length} onChange={(e) => toggleSelectAll(e.target.checked)} className="rounded" /></th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Date</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Order Code</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Customer</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Service</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Item Type</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Items</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Days</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Served by</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Paid</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Balance</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Total</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Status</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Payment</th>
                            <th className="py-4 px-4 text-left font-semibold text-gray-700 text-xs uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {orders.map((order) => {
                            const firstItem = getOrderItems(order).length > 0
                              ? getOrderItems(order)[0]
                              : { servicetype: [], itemtype: [], itemname: '' };
                            const customer = order.customer || { name: 'Unknown', phone: '' };
                            const orderStatusConfig = STATUS_COLORS[order.order_status] || STATUS_COLORS.pending;
                            const paymentStatusConfig = PAYMENT_STATUS_COLORS[order.payment_status] || PAYMENT_STATUS_COLORS.pending;
                            const daysSinceOrder = calculateDaysSince(order.created_at);

                            return (
                              <tr key={order.id} className="hover:bg-gray-50">
                                <td className="px-6 text-center py-4"><input type="checkbox" checked={selectedOrders.has(order.id)} onChange={() => toggleOrderSelection(order.id)} className="rounded" /></td>
                                <td className="text-left px-4 py-4 text-xs text-gray-900">{formatDate(order.created_at)}</td>
                                <td className="px-4 py-2 text-xs font-medium text-gray-900">{displayOrderCode(order)}</td>
                                <td className="px-4 py-2">
                                  <div className="text-xs text-gray-800">{customer.name}</div>
                                  <div className="text-xs text-gray-500">{customer.phone}</div>
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-800">{formatServiceType(firstItem.servicetype)}</td>
                                <td className="px-4 py-2 text-xs text-gray-800">{formatListValue(firstItem.itemtype)}</td>
                                <td className="px-4 py-2 text-xs text-gray-800 max-w-xs truncate">{firstItem.itemname || 'N/A'}</td>
                                <td className="px-4 py-2"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${daysSinceOrder > 7 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}><Clock className="w-3 h-3 mr-1" />{daysSinceOrder}d</span></td>
                                <td className="px-4 py-2 text-xs text-blue-900 font-semibold">{getUserFullName(order)}</td>
                                <td className="px-4 py-2 text-xs text-blue-900 font-semibold">{formatCurrency(order.amount_paid)}</td>
                                <td className="px-4 py-2 text-xs text-blue-900 font-semibold">{formatCurrency(order.balance)}</td>
                                <td className="px-4 py-2 text-xs text-blue-900 font-semibold">{formatCurrency(order.total_price)}</td>
                                <td className="py-4 px-2"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${orderStatusConfig.text} ${orderStatusConfig.bg}`}><orderStatusConfig.icon className="w-3 h-3 mr-1" />{order.order_status}</span></td>
                                <td className="px-4 py-2"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${paymentStatusConfig.text} ${paymentStatusConfig.bg}`}><paymentStatusConfig.icon className="w-3 h-3 mr-1" />{order.payment_status}</span></td>
                                <td className="px-4 py-2">
                                  <div className="flex items-center space-x-2">
                                    <button onClick={() => { setSelectedOrders(new Set([order.id])); setShowSMSModal(true); }} className="p-2 text-green-600 hover:bg-green-100 rounded-lg" title="Send SMS"><Send className="w-4 h-4" /></button>
                                    <button onClick={() => { setCurrentOrder(order); setShowPaymentModal(true); }} className="p-2 text-green-600 hover:bg-green-100 rounded-lg" title="Payment"><CheckCircle className="w-4 h-4" /></button>
                                    <button onClick={() => { setCurrentOrder(order); setShowReceiptModal(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="Receipt"><Printer className="w-4 h-4" /></button>
                                    <div className="relative" ref={el => dropdownRefs.current[order.id] = el}>
                                      <button onClick={() => setOpenDropdownId(openDropdownId === order.id ? null : order.id)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><EllipsisVertical className="w-4 h-4" /></button>
                                      {openDropdownId === order.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                                          {order.order_status !== 'Completed' && <button onClick={() => { updateOrderStatus(order.id, 'Completed'); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center"><CheckCircle className="w-4 h-4 mr-2" /> Complete</button>}
                                          {order.order_status !== 'Delivered_picked' && <button onClick={() => { updateOrderStatus(order.id, 'Delivered_picked'); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 flex items-center"><Truck className="w-4 h-4 mr-2" /> Deliver</button>}
                                          <div className="border-t border-gray-100 my-1"></div>
                                          <button onClick={() => { deleteOrder(order.id, order.uniquecode); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"><Trash2 className="w-4 h-4 mr-2" /> Delete</button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-700">Showing <span className="font-medium">{((pagination.currentPage - 1) * pagination.pageSize) + 1}</span> to <span className="font-medium">{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)}</span> of <span className="font-medium">{pagination.totalItems}</span> orders</div>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => fetchOrders(pagination.currentPage - 1)} disabled={!pagination.previous} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Previous</button>
                          <div className="flex items-center space-x-1">{renderPageNumbers()}</div>
                          <button onClick={() => fetchOrders(pagination.currentPage + 1)} disabled={!pagination.next} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Next</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
        </div>

        {/* Modals */}
        {showSMSModal && (
          <SMSDialogModal
            selectedOrders={selectedOrderObjects}
            allOrders={allOrders}
            onSend={sendBulkSMS}
            onClose={() => { setShowSMSModal(false); setAllOrders([]); }}
            loadAllOrders={fetchAllOrders}
            loadingAll={loadingAll}
            currentFilters={filters}
          />
        )}

        {/* Payment Modal */}
        {showPaymentModal && currentOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Complete Payment</h2>
              <p className="text-gray-600 text-sm mb-6">Confirm payment for order {currentOrder.uniquecode}.</p>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between mb-2">
                  <span>Total Due:</span>
                  <span className="font-bold">{formatCurrency(currentOrder.total_price)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Already Paid:</span>
                  <span className="text-green-600 font-bold">{formatCurrency(currentOrder.amount_paid)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Current Balance:</span>
                  <span className="text-red-600 font-bold">{formatCurrency(currentOrder.balance)}</span>
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-gray-300">
                  <span className="font-bold">Amount to Pay Now:</span>
                  <span className="font-bold text-blue-600">{formatCurrency(currentOrder.balance)}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentType}
                  onChange={e => setPaymentType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const token = getAuthToken();

                      // Calculate new amount paid (existing amount + balance)
                      const totalPrice = parseFloat(currentOrder.total_price);
                      const currentBalance = parseFloat(currentOrder.balance);
                      const currentAmountPaid = parseFloat(currentOrder.amount_paid);

                      // Update amount paid to include the current balance payment
                      const newAmountPaid = currentAmountPaid + currentBalance;

                      const response = await fetch(`${ORDERS_URL}${currentOrder.id}/`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token && { 'Authorization': `Bearer ${token}` })
                        },
                        body: JSON.stringify({
                          payment_status: 'completed',
                          payment_type: paymentType,
                          amount_paid: newAmountPaid.toFixed(2), // Update amount paid with the new total
                          balance: '0.00' // Set balance to zero
                        })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to update payment');
                      }

                      // Refresh the orders list and close modal
                      fetchOrders(pagination.currentPage);
                      setShowPaymentModal(false);
                      alert('Payment completed successfully! Balance set to zero.');

                    } catch (err) {
                      console.error('Payment update error:', err);
                      alert('Failed to complete payment. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Complete Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceiptModal && currentOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
              <button onClick={() => setShowReceiptModal(false)} className="text-gray-600 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              <div className="text-center items-center mb-4">
               
                    <h3 className="font-bold text-lg text-gray-900">Clean Page Laundry</h3>
                    <p>Be Spotless Be Bright</p>
               
                
                
              </div>
                <div className="text-sm mb-4 w-full">
                  <div className=" justify-center w-[100%] items-center">
                  <p className="mb-1"><strong>Order:</strong> {currentOrder.uniquecode}</p>
                  <p className="mb-1"><strong>Date:</strong> {formatDate(currentOrder.created_at)}</p>
                  <p className="mb-3"><strong>Customer:</strong> {getOrderCustomer(currentOrder).name}</p>
                  <p className="mb-3"><strong>Customer:</strong> {getOrderCustomer(currentOrder).phone}</p>
                </div>
                <hr className="my-2" />
                
                {getOrderItems(currentOrder).map((item, i) => (
                  <div key={i} className="flex justify-between mb-1">
                    <span>{item.itemname}</span>
                    <span>{formatCurrency(item.unit_price)}</span>
                  </div>
                ))}
                <hr className="my-2" />
                <div className="flex justify-between font-bold mb-1">
                  <span>Total</span>
                  <span>{formatCurrency(currentOrder.total_price)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Paid</span>
                  <span>{formatCurrency(currentOrder.amount_paid)}</span>
                </div>
                <div className="flex justify-between mb-3">
                  <span>Balance</span>
                  <span>{formatCurrency(currentOrder.balance)}</span>
                </div>
              </div>
              <div className="text-center">
                <p>Served by: {currentUserName}</p>
                <p>Contact us:  0705588354 </p>
                <p>Thankyou for trusting our services!</p>
              </div>
              <button
                onClick={() => window.print()}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Print Receipt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
