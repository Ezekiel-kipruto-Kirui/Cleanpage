import { useState, useEffect, useCallback } from "react";
import { Order, User } from "@/services/types";
import { fetchApi } from "@/services/api";
import { ROUTES } from "@/services/Routes";

const ORDERS_URL = "orders/";

// Statistics interface
interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  shop_a_data: {
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
  };
  shop_b_data: {
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
  };
}

export default function LaundryDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    shop_a_data: {
      total_orders: 0,
      pending_orders: 0,
      completed_orders: 0
    },
    shop_b_data: {
      total_orders: 0,
      pending_orders: 0,
      completed_orders: 0
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fetch current user with authentication
  const fetchCurrentUser = useCallback(async () => {
    try {
      // Use the correct endpoint: /api/me/ (without the extra /auth/)
      // Option 1: Using /api/me/
      const userData = await fetchApi<{ user: User }>(
        "me/",
        { method: 'GET' },
        'auth'
      );
      setCurrentUser(userData.user);

      // OR Option 2: Using /api/users/me/ (if that's what your Django shows)
      // const userData = await fetchApi<{ user: User }>(
      //   "users/me/",
      //   { method: 'GET' },
      //   'auth'
      // );
      // setCurrentUser(userData.user);

    } catch (err) {
      console.error("Failed to fetch user:", err);
      // Try to get user from localStorage as fallback
      try {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch {
        // Continue without user data if it fails
      }
    }
  }, []);

  // Fetch orders and calculate statistics with authentication
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use fetchApi which handles authentication automatically
      const apiData = await fetchApi<any>(
        ORDERS_URL,
        { method: 'GET' },
        'laundry'
      );

      let ordersList: Order[] = [];

      if (Array.isArray(apiData)) {
        ordersList = apiData;
      } else if (apiData.results) {
        ordersList = apiData.results;
      } else if (apiData.data) {
        ordersList = apiData.data;
      } else {
        ordersList = apiData;
      }

      setOrders(ordersList);

      // Calculate statistics
      calculateStatistics(ordersList);

    } catch (err: any) {
      console.error("Fetch Error:", err);
      // Handle unauthorized error specifically
      if (err.message === "Unauthorized" || err.message?.includes("401")) {
        setError("Session expired. Please login again.");
      } else {
        setError(`Failed to fetch orders: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate statistics from orders
  const calculateStatistics = (ordersList: Order[]) => {
    let totalOrders = ordersList.length;
    let pendingOrders = 0;
    let completedOrders = 0;

    // Shop A statistics
    let shopATotal = 0;
    let shopAPending = 0;
    let shopACompleted = 0;

    // Shop B statistics
    let shopBTotal = 0;
    let shopBPending = 0;
    let shopBCompleted = 0;

    ordersList.forEach(order => {
      // Fix TypeScript error by using proper string comparison
      const orderStatusLower = order.order_status?.toLowerCase() || '';
      const paymentStatusLower = order.payment_status?.toLowerCase() || '';

      // Check for pending orders (both order_status and payment_status)
      const isPending = orderStatusLower === 'pending' ||
        paymentStatusLower === 'pending';

      // Check for completed orders
      const isCompleted = orderStatusLower === 'completed' ||
        orderStatusLower === 'delivered_picked' ||
        paymentStatusLower === 'completed';

      if (isPending) {
        pendingOrders++;
        if (order.shop === 'Shop A') {
          shopAPending++;
        } else if (order.shop === 'Shop B') {
          shopBPending++;
        }
      }

      if (isCompleted) {
        completedOrders++;
        if (order.shop === 'Shop A') {
          shopACompleted++;
        } else if (order.shop === 'Shop B') {
          shopBCompleted++;
        }
      }

      // Count total by shop
      if (order.shop === 'Shop A') {
        shopATotal++;
      } else if (order.shop === 'Shop B') {
        shopBTotal++;
      }
    });

    setStats({
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      completed_orders: completedOrders,
      shop_a_data: {
        total_orders: shopATotal,
        pending_orders: shopAPending,
        completed_orders: shopACompleted
      },
      shop_b_data: {
        total_orders: shopBTotal,
        pending_orders: shopBPending,
        completed_orders: shopBCompleted
      }
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.allSettled([
          fetchCurrentUser(),
          fetchOrders()
        ]);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    };

    loadData();
  }, [fetchCurrentUser, fetchOrders]);

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Laundry Dashboard</h1>
            </div>
            {currentUser && (
              <div className="mt-4 md:mt-0 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-blue-700">
                    {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{currentUser.email || 'User'}</p>
                  <p className="text-xs text-gray-500">
                    {currentUser.is_superuser ? 'Admin' : currentUser.is_staff ? 'Staff' : 'User'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Orders Card */}
          <div className="bg-white rounded-xl shadow-md border-l-4 border-amber-500 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-xl mr-4">
                <svg className="h-7 w-7 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.total_orders)}</p>
                {currentUser?.is_superuser && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>
                      <span className="text-xs text-amber-600">{formatNumber(stats.shop_a_data.total_orders)} Shop A</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                      <span className="text-xs text-green-600">{formatNumber(stats.shop_b_data.total_orders)} Shop B</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pending Orders Card */}
          <div className="bg-white rounded-xl shadow-md border-l-4 border-red-500 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-xl mr-4">
                <svg className="h-7 w-7 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.pending_orders)}</p>
                {currentUser?.is_superuser && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>
                      <span className="text-xs text-amber-600">{formatNumber(stats.shop_a_data.pending_orders)} Shop A</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                      <span className="text-xs text-green-600">{formatNumber(stats.shop_b_data.pending_orders)} Shop B</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Completed Orders Card */}
          <div className="bg-white rounded-xl shadow-md border-l-4 border-green-500 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-xl mr-4">
                <svg className="h-7 w-7 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Completed Orders</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.completed_orders)}</p>
                {currentUser?.is_superuser && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>
                      <span className="text-xs text-amber-600">{formatNumber(stats.shop_a_data.completed_orders)} Shop A</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                      <span className="text-xs text-green-600">{formatNumber(stats.shop_b_data.completed_orders)} Shop B</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4 text-lg">Loading dashboard data...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-8 bg-red-50 rounded-xl border border-red-200 mb-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="font-semibold text-red-700 mb-2">Error loading data</p>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchOrders();
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick Actions */}
        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-5">
              <h3 className="text-xl font-semibold text-gray-900">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Create New Order */}
              <a href={ROUTES.laundryCreateOrder}
                className="group p-6 hover:bg-blue-50 transition-colors duration-200">
                <div className="flex items-center">
                  <div
                    className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mr-4 group-hover:bg-blue-200 transition-colors duration-200">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                      Create Laundry Order</p>
                    <p className="text-sm text-gray-600 mt-1">Add a new laundry order for processing</p>
                  </div>
                  <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-200 ml-2"
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>

              {/* View Orders */}
              <a href={ROUTES.laundryOrders}
                className="group p-6 hover:bg-amber-50 transition-colors duration-200">
                <div className="flex items-center">
                  <div
                    className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl mr-4 group-hover:bg-amber-200 transition-colors duration-200">
                    <svg className="h-6 w-6 text-amber-600" xmlns="http://www.w3.org/2000/svg"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-base font-semibold text-gray-900 group-hover:text-amber-600 transition-colors duration-200">
                      View Laundry Orders</p>
                    <p className="text-sm text-gray-600 mt-1">Manage all laundry orders and status</p>
                  </div>
                  <svg className="h-5 w-5 text-gray-400 group-hover:text-amber-600 transition-colors duration-200 ml-2"
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>

              {/* Manage Customers */}
              <a href={ROUTES.laundryCustomers}
                className="group p-6 hover:bg-green-50 transition-colors duration-200">
                <div className="flex items-center">
                  <div
                    className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mr-4 group-hover:bg-green-200 transition-colors duration-200">
                    <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-base font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                      Manage Customers</p>
                    <p className="text-sm text-gray-600 mt-1">View and edit customer information</p>
                  </div>
                  <svg className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors duration-200 ml-2"
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}