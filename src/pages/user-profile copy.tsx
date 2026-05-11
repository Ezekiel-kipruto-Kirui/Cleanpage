import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from "@/services/url"
import { getAccessToken } from "@/services/api"
import {
  Package,
  Coffee,
  DollarSign,
  Calendar,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

// Constants for API endpoints
const USER_PROFILE_URL = `${API_BASE_URL}/me/`
const LAUNDRY_ORDERS_URL = `${API_BASE_URL}/Laundry/orders/`
const HOTEL_ORDERS_URL = `${API_BASE_URL}/Hotel/orders/`

// Helper function to get authorization header
const getAuthHeader = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Define User interface
interface AppUser {
  id: number;
  email: string;
  user_type: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

interface LaundryOrder {
  id: number;
  uniquecode: string;
  customer: {
    id: number;
    name: string;
    phone: string;
  } | null;
  total_price: string;
  order_status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  created_by: {
    id: number;
    email: string;
  } | null;
  updated_by: {
    id: number;
    email: string;
  } | null;
  items: Array<{
    id: number;
    servicetype: string[];
    itemtype: string;
    itemname: string;
    quantity: number;
  }>;
}

interface HotelOrder {
  id: number;
  order_items: Array<{
    id: number;
    food_item_name: string;
    total_price: number;
    quantity: number;
    price: string;
  }>;
  total_amount: number;
  created_by_email: string;
  created_at: string;
  // FIX: Allow created_by to be a number OR an object (matching Laundry API structure)
  created_by: number | { id: number; email: string } | null;
}

type OrderView = 'hotel' | 'laundry';

const UserProfile = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLaundryOrders, setUserLaundryOrders] = useState<LaundryOrder[]>([]);
  const [userHotelOrders, setUserHotelOrders] = useState<HotelOrder[]>([]);
  const [activeView, setActiveView] = useState<OrderView>('laundry');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError('Please login to view your profile');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Fetch user profile
      const userResponse = await axios.get(USER_PROFILE_URL, {
        headers: getAuthHeader()
      });
      
      const currentUser = userResponse.data;
      setUser(currentUser);

      // Fetch laundry orders
      try {
        const laundryResponse = await axios.get(LAUNDRY_ORDERS_URL, {
          headers: getAuthHeader(),
          params: { page_size: 100 }
        });

        let laundryOrdersData: LaundryOrder[] = [];
        if (Array.isArray(laundryResponse.data)) {
          laundryOrdersData = laundryResponse.data;
        } else if (laundryResponse.data?.results) {
          laundryOrdersData = laundryResponse.data.results;
        }

        // Filter orders created by current user
        const userLaundryOrders = laundryOrdersData.filter(order => 
          order.created_by?.id === currentUser.id
        );
        setUserLaundryOrders(userLaundryOrders);
      } catch (err) {
        console.error('Error fetching laundry orders:', err);
      }

      // Fetch hotel orders
      try {
        // FIX: Increased page_size to 500 to ensure we capture more orders
        const hotelResponse = await axios.get(HOTEL_ORDERS_URL, {
          headers: getAuthHeader(),
          params: { page_size: 500 }
        });

        let hotelOrdersData: HotelOrder[] = [];
        if (Array.isArray(hotelResponse.data)) {
          hotelOrdersData = hotelResponse.data;
        } else if (hotelResponse.data?.results) {
          hotelOrdersData = hotelResponse.data.results;
        }

        // FIX: Robust filtering logic to handle different API response shapes for 'created_by'
        const userHotelOrders = hotelOrdersData.filter(order => {
          // Extract ID safely
          let orderCreatorId: number | undefined;
          
          if (typeof order.created_by === 'object' && order.created_by !== null) {
            orderCreatorId = order.created_by.id;
          } else if (typeof order.created_by === 'number') {
            orderCreatorId = order.created_by;
          }

          // Match by ID or fallback to Email
          return orderCreatorId === currentUser.id || 
                 order.created_by_email === currentUser.email;
        });

        console.log(`Found ${userHotelOrders.length} hotel orders for user ${currentUser.id}`);
        setUserHotelOrders(userHotelOrders);
      } catch (err) {
        console.error('Error fetching hotel orders:', err);
      }

    } catch (err: any) {
      console.error('Error fetching user data:', err);
      
      if (err.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to access this data.');
      } else if (err.message?.includes('Network Error')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to fetch user data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Calculate statistics
  const getLaundryStats = () => {
    const createdOrders = userLaundryOrders.filter(order => 
      order.created_by?.id === user?.id
    ).length;
    
    const updatedOrders = userLaundryOrders.filter(order => 
      order.updated_by?.id === user?.id && 
      order.created_by?.id !== user?.id
    ).length;

    const pendingOrders = userLaundryOrders.filter(order => 
      order.order_status === 'pending'
    ).length;

    const completedOrders = userLaundryOrders.filter(order => 
      order.order_status === 'Completed' || 
      order.order_status === 'Delivered_picked'
    ).length;

    const totalRevenue = userLaundryOrders.reduce((sum, order) => 
      sum + (parseFloat(order.total_price) || 0), 0
    );

    return { createdOrders, updatedOrders, pendingOrders, completedOrders, totalRevenue };
  };

  const getHotelStats = () => {
    const createdOrders = userHotelOrders.length;
    const totalRevenue = userHotelOrders.reduce((sum, order) => 
      sum + (order.total_amount || 0), 0
    );

    return { createdOrders, totalRevenue };
  };

  const laundryStats = getLaundryStats();
  const hotelStats = getHotelStats();

  const totalOrdersCreated = laundryStats.createdOrders + hotelStats.createdOrders;

  // Filter orders by date
  const getFilteredOrders = () => {
    const orders = activeView === 'laundry' ? userLaundryOrders : userHotelOrders;
    
    if (!dateFilter.startDate && !dateFilter.endDate) {
      return orders;
    }

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
      const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;
      
      if (startDate && orderDate < startDate) return false;
      if (endDate && orderDate > new Date(endDate.getTime() + 86400000)) return false;
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString('en-KE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'Delivered_picked':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Clear filters
  const clearFilters = () => {
    setDateFilter({ startDate: '', endDate: '' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading profile data...</p>
      </div>
    );
  }

  // Error state
  if (error && !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-red-600 text-xl font-semibold mb-3">Authentication Required</div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Go to Login
            </button>
            <button
              onClick={fetchUserData}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* User Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Profile Information</h2>
            <div className="text-sm text-gray-500">User ID: #{user?.id}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email Address</label>
                <p className="text-gray-800 font-medium mt-1">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-gray-800 font-medium mt-1">
                  {user?.first_name || user?.last_name 
                    ? `${user?.first_name} ${user?.last_name}`.trim()
                    : 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">User Role</label>
                <p className="text-gray-800 font-medium mt-1 capitalize">{user?.user_type || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Account Status</label>
                <p className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${user?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className={`font-medium ${user?.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Total Orders Created</label>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {totalOrdersCreated}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Revenue Generated</label>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(laundryStats.totalRevenue + hotelStats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl mr-4">
                <Package className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{laundryStats.createdOrders}</h3>
                <p className="text-sm text-gray-500">Laundry Orders Created</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-green-600">{laundryStats.completedOrders} completed</span>
              <span className="text-yellow-600">{laundryStats.pendingOrders} pending</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-amber-100 rounded-xl mr-4">
                <Coffee className="text-amber-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{hotelStats.createdOrders}</h3>
                <p className="text-sm text-gray-500">Hotel Orders Created</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              All hotel orders
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl mr-4">
                <TrendingUp className="text-purple-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{laundryStats.updatedOrders}</h3>
                <p className="text-sm text-gray-500">Orders Updated</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Laundry orders you've updated
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl mr-4">
                <DollarSign className="text-green-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {formatCurrency(laundryStats.totalRevenue + hotelStats.totalRevenue)}
                </h3>
                <p className="text-sm text-gray-500">Total Revenue</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-blue-600">{formatCurrency(laundryStats.totalRevenue)} laundry</span>
              <span className="text-amber-600">{formatCurrency(hotelStats.totalRevenue)} hotel</span>
            </div>
          </div>
        </div>

        {/* Orders Management Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">My Orders</h2>
                <p className="text-gray-500 text-sm mt-1">
                  View and manage orders you've created and updated
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* Order Type Toggle */}
                <div className="flex rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => setActiveView('laundry')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === 'laundry'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Package className="w-4 h-4 inline mr-2" />
                    Laundry Orders
                  </button>
                  <button
                    onClick={() => setActiveView('hotel')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === 'hotel'
                        ? 'bg-white text-amber-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Coffee className="w-4 h-4 inline mr-2" />
                    Hotel Orders
                  </button>
                </div>

                {/* Date Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Date Range:</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                    <span className="hidden sm:inline text-gray-400 self-center">to</span>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                    {(dateFilter.startDate || dateFilter.endDate) && (
                      <button
                        onClick={clearFilters}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                {activeView === 'laundry' ? (
                  <>
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No laundry orders found</h3>
                  </>
                ) : (
                  <>
                    <Coffee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hotel orders found</h3>
                  </>
                )}
                <p className="text-gray-500">
                  {dateFilter.startDate || dateFilter.endDate
                    ? 'No orders match your date filter. Try adjusting the date range.'
                    : 'No orders created by you yet.'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {activeView === 'laundry' ? (
                      <>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Order Code
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Order Status
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Payment Status
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Created/Updated
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Total Amount
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Date
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Items
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Total Amount
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeView === 'laundry'
                    ? (filteredOrders as LaundryOrder[]).map((order) => {
                        const isCreator = order.created_by?.id === user?.id;
                        const isUpdater = order.updated_by?.id === user?.id && !isCreator;
                        
                        return (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="py-4 px-6">
                              <div className="font-mono text-sm font-medium text-gray-800">
                                {order.uniquecode}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-medium text-gray-800">{order.customer?.name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{order.customer?.phone || ''}</div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.order_status)}`}>
                                {order.order_status === 'Delivered_picked' ? 'Delivered' : order.order_status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                                {order.payment_status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  isCreator ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {isCreator ? 'Created' : 'Updated'}
                                </span>
                                <div className="text-sm text-gray-500">
                                  {formatDate(isCreator ? order.created_at : order.updated_at)}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-green-700">
                                {formatCurrency(parseFloat(order.total_price))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    : (filteredOrders as HotelOrder[]).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="py-4 px-6">
                            <div className="font-mono text-sm font-medium text-gray-800">#{order.id}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm text-gray-600">
                              {formatDate(order.created_at)}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-medium text-gray-800">
                              {order.order_items?.length || 0} item{order.order_items?.length !== 1 ? 's' : ''}
                            </div>
                            {order.order_items && order.order_items.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {order.order_items[0].food_item_name}
                                {order.order_items.length > 1 && ` +${order.order_items.length - 1} more`}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-green-700">
                              {formatCurrency(order.total_amount || 0)}
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer */}
          {filteredOrders.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {filteredOrders.length} of{' '}
                  {activeView === 'laundry' ? userLaundryOrders.length : userHotelOrders.length} orders
                </div>
                <div className="text-sm text-gray-600">
                  {dateFilter.startDate && (
                    <span className="mr-3">From: {dateFilter.startDate}</span>
                  )}
                  {dateFilter.endDate && (
                    <span>To: {dateFilter.endDate}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={fetchUserData}
              className="mt-2 text-red-700 hover:text-red-800 text-sm font-medium"
            >
              Try refreshing the data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;