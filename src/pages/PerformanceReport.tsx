import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import {
  TrendingUp,
  Wallet,
  ChartLine,
  ShoppingBag,
  CreditCard,
  Utensils,
  Filter,
  RefreshCw,
  Crown,
  Box,
  Bath,
  Users,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import Chart from 'chart.js/auto';
import { getAccessToken } from "@/services/api";
import { API_BASE_URL } from "@/services/url";

import type { Chart as ChartType } from 'chart.js/auto';

// --- Types & Interfaces ---

// Updated to match the actual API response structure
interface DashboardResponse {
  success?: boolean;
  data?: {
    order_stats?: {
      total_orders: number;
      pending_orders: number;
      completed_orders: number;
      delivered_orders: number;
      total_revenue: number;
      avg_order_value: number;
      total_balance: number;
      total_amount_paid: number;
    };
    payment_stats?: {
      pending_payments: number;
      partial_payments: number;
      complete_payments: number;
      total_pending_amount: number;
      total_partial_amount: number;
      total_complete_amount: number;
      total_collected_amount: number;
      total_balance_amount: number;
      overdue_payments: number;
      total_overdue_amount: number;
    };
    payment_type_stats?: {
      [key: string]: {
        count: string;  // Note: API returns strings for these
        total_amount: string;
        amount_collected: string;
      }
    };
    expense_stats?: {
      total_expenses: number;
      shop_a_expenses: number;
      shop_b_expenses: number;
      average_expense: number;
    };
    hotel_stats?: {
      total_orders: number;
      total_revenue: number;
      avg_order_value: number;
      total_expenses: number;
      net_profit: number;
    };
    business_growth?: {
      total_revenue: number;
      total_orders: number;
      total_expenses: number;
      net_profit: number;
    };
    revenue_by_shop?: Array<{ shop: string; total_revenue: string; paid: string; bal: string }>;
    balance_by_shop?: Array<{ shop: string; total_balance: string }>;
    common_customers?: Array<{ customer__name: string; customer__phone: string; count: string; spent: string }>;
    top_services?: Array<{ servicetype: string; count: string }>;
    common_items?: Array<{ itemname: string; count: string }>;
    monthly_business_growth?: Array<{
      label: string;
      data: number[];
      borderColor: string;
      fill?: string | boolean;
      borderDash?: number[];
    }>;
    shop_a_stats?: {
      revenue: number;
      total_orders: number;
      pending_orders: number;
      completed_orders: number;
      pending_payments: number;
      partial_payments: number;
      complete_payments: number;
      total_pending_amount: number;
      total_partial_amount: number;
      total_complete_amount: number;
      total_balance: number;
      total_amount_paid: number;
      total_expenses: number;
      net_profit: number;
    };
    shop_b_stats?: {
      revenue: number;
      total_orders: number;
      pending_orders: number;
      completed_orders: number;
      pending_payments: number;
      partial_payments: number;
      complete_payments: number;
      total_pending_amount: number;
      total_partial_amount: number;
      total_complete_amount: number;
      total_balance: number;
      total_amount_paid: number;
      total_expenses: number;
      net_profit: number;
    };
    payment_methods?: Array<{
      payment_type: string;
      count: string;
      total: string;
    }>;
    service_types?: Array<{
      servicetype: string;
      count: string;
    }>;
  };
  message?: string;
  error?: string;
}

// --- Constants & Helpers ---

const COLOR_PALETTE = {
  navyBlue: '#1E3A8A',
  orangeYellow: '#F59E0B',
  lightOrange: '#FBBF24',
  pink: '#EC407A',
  lightPink: '#F48FB1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  blue: '#36A2EB',
  red: '#FF6384',
  teal: '#4BC0C0',
  purple: '#9C27B0',
  indigo: '#3F51B5',
  green: '#4CAF50'
};

const STYLE_MAPS = {
  card: {
    blue: 'bg-blue-50 text-blue-800',
    purple: 'bg-purple-50 text-purple-800',
    red: 'bg-red-50 text-red-800',
    green: 'bg-green-50 text-green-800',
    orange: 'bg-orange-50 text-orange-800'
  },
  metric: {
    red: 'from-red-50 to-red-100 border-red-100',
    orange: 'from-orange-50 to-orange-100 border-orange-100',
    blue: 'from-blue-50 to-blue-100 border-blue-100',
    pink: 'from-pink-50 to-pink-100 border-pink-100',
    green: 'from-green-50 to-emerald-100 border-green-100',
    purple: 'from-purple-50 to-purple-100 border-purple-100'
  },
  badge: {
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800'
  },
  status: {
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800'
  },
  chartTitle: {
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    gray: 'text-gray-500',
    blue: 'text-blue-500',
    red: 'text-red-500',
    purple: 'text-purple-500'
  }
};

// Helper function to parse string values from API
const parseNumber = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
const formatCurrencyFull = (amount: number) => new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num || 0);

const CHART_COMMON_OPTIONS = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: { labels: { color: '#1E293B', font: { size: 11, weight: 500 } } },
    tooltip: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      titleColor: '#1E293B',
      bodyColor: '#1E293B',
      callbacks: {
        label: (ctx: any) => {
          const value = ctx.raw || 0;
          return `Ksh ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      }
    }
  }
};

// Payment types in the correct order based on API response
const PAYMENT_TYPES = ['cash', 'other', 'bank_transfer', 'None'];

// --- Main Component ---

export default function PerformanceReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State to hold full dashboard response
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  // State for Date Range Filtering
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [today] = useState(new Date().toISOString().split('T')[0]);

  // Chart Refs
  const revenueComparisonChartRef = useRef<HTMLCanvasElement>(null);
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const trendChartRef = useRef<HTMLCanvasElement>(null);
  const servicesChartRef = useRef<HTMLCanvasElement>(null);
  const productsChartRef = useRef<HTMLCanvasElement>(null);
  const paymentTypeChartRef = useRef<HTMLCanvasElement>(null);

  const chartInstances = useRef<Map<HTMLCanvasElement, ChartType>>(new Map());
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const queryString = params.toString();
      // CORRECTED ENDPOINT URL
      const url = `${API_BASE_URL}/Report/dashboard/${queryString ? '?' + queryString : ''}`;

      console.log('[Dashboard] Fetching from:', url);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch dashboard data`);
      }

      const json: DashboardResponse = await response.json();
      console.log('[Dashboard] Response:', json);

      // Backend wraps response with success/data/message
      if (json.success && json.data) {
        setDashboardData(json);
      } else {
        throw new Error(json.error || json.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      console.error('[Dashboard] Fetch error:', err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    updateIntervalRef.current = interval;

    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, [fetchData]);

  // --- Data Processing ---

  const processedData = useMemo(() => {
    if (!dashboardData?.data) return null;

    const data = dashboardData.data;
    const { order_stats, payment_stats, expense_stats, hotel_stats, business_growth, payment_type_stats } = data;

    // Basic metrics with safe access using parseNumber helper
    const totalBusinessRevenue = parseNumber(business_growth?.total_revenue || 0);
    const totalNetProfit = parseNumber(business_growth?.net_profit || 0);
    const totalBusinessExpenses = parseNumber(business_growth?.total_expenses || 0);

    const hotelRevenue = parseNumber(hotel_stats?.total_revenue || 0);
    const laundryRevenue = parseNumber(order_stats?.total_revenue || 0);
    const hotelTotalOrders = parseNumber(hotel_stats?.total_orders || 0);
    const hotelNetProfit = parseNumber(hotel_stats?.net_profit || 0);
    const hotelTotalExpenses = parseNumber(hotel_stats?.total_expenses || 0);

    // Payment methods from payment_type_stats
    const paymentMethods = PAYMENT_TYPES.map(type => ({
      name: type === 'None' ? 'Not Paid' : type.charAt(0).toUpperCase() + type.slice(1),
      amount: parseNumber(payment_type_stats?.[type]?.amount_collected) || 0,
      count: parseNumber(payment_type_stats?.[type]?.count) || 0,
      totalAmount: parseNumber(payment_type_stats?.[type]?.total_amount) || 0
    })).filter(p => p.count > 0); // Only show payment methods with data

    // Shop metrics
    const shopA = data.shop_a_stats;
    const shopB = data.shop_b_stats;

    // Revenue Comparison Chart Data
    const revenueComparisonLabels = ['Laundry Business', 'Hotel Business'];
    const revenueComparisonData = [laundryRevenue, hotelRevenue];
    const revenueComparisonColors = [COLOR_PALETTE.blue, COLOR_PALETTE.red];

    // Revenue by Shop (Pie Chart) - using parseNumber for string values
    const pieChartLabels = (data.revenue_by_shop || []).map(s => s.shop);
    const pieChartValues = (data.revenue_by_shop || []).map(s => parseNumber(s.total_revenue));

    // Services & Items
    const servicesLabels = (data.top_services || []).map(s => s.servicetype);
    const servicesCounts = (data.top_services || []).map(s => parseNumber(s.count));

    const itemLabels = (data.common_items || []).map(i => i.itemname);
    const itemCounts = (data.common_items || []).map(i => parseNumber(i.count));

    // Top Customers
    const topCustomersList = (data.common_customers || []).map(c => ({
      name: c.customer__name || 'Unknown Customer',
      phone: c.customer__phone || '',
      orders: parseNumber(c.count) || 0,
      spent: parseNumber(c.spent) || 0
    }));

    // Payment type chart data from payment_methods array
    const paymentMethodsData = data.payment_methods || [];
    const paymentTypeChartLabels = paymentMethodsData.map(item =>
      item.payment_type === 'None' ? 'Not Paid' : item.payment_type.charAt(0).toUpperCase() + item.payment_type.slice(1)
    );
    const paymentTypeChartData = paymentMethodsData.map(item => parseNumber(item.total));
    const paymentTypeChartColors = [
      COLOR_PALETTE.green,   // cash
      COLOR_PALETTE.orangeYellow, // other
      COLOR_PALETTE.teal,    // bank transfer
      COLOR_PALETTE.danger   // none
    ];

    return {
      // Core business metrics
      totalBusinessRevenue,
      totalNetProfit,
      totalBusinessExpenses,

      // Hotel specific
      hotelRevenue,
      hotelTotalOrders,
      hotelNetProfit,
      hotelTotalExpenses,

      // Laundry specific
      laundryRevenue,
      totalBalanceAmount: parseNumber(order_stats?.total_balance) || 0,

      // Payment stats
      pendingPayments: parseNumber(payment_stats?.pending_payments) || 0,
      totalPendingAmount: parseNumber(payment_stats?.total_pending_amount) || 0,
      partialPayments: parseNumber(payment_stats?.partial_payments) || 0,
      totalPartialAmount: parseNumber(payment_stats?.total_partial_amount) || 0,
      completePayments: parseNumber(payment_stats?.complete_payments) || 0,
      totalCompleteAmount: parseNumber(payment_stats?.total_complete_amount) || 0,
      overduePayments: parseNumber(payment_stats?.overdue_payments) || 0,
      totalOverdueAmount: parseNumber(payment_stats?.total_overdue_amount) || 0,
      totalCollectedAmount: parseNumber(payment_stats?.total_collected_amount) || 0,

      // Expense stats
      totalExpenses: parseNumber(expense_stats?.total_expenses) || 0,
      shopAExpenses: parseNumber(expense_stats?.shop_a_expenses) || 0,
      shopBExpenses: parseNumber(expense_stats?.shop_b_expenses) || 0,

      // Shop performance
      shopA,
      shopB,

      // Chart data
      revenueComparisonLabels,
      revenueComparisonData,
      revenueComparisonColors,
      pieChartLabels,
      pieChartValues,
      servicesLabels,
      servicesCounts,
      itemLabels,
      itemCounts,
      paymentTypeChartLabels,
      paymentTypeChartData,
      paymentTypeChartColors,

      // Lists
      commonCustomers: topCustomersList,
      paymentMethods,
      monthlyBusinessGrowth: data.monthly_business_growth || [],

      // Raw data for debugging
      rawData: data
    };
  }, [dashboardData]);

  // --- Chart Rendering ---
  useEffect(() => {
    if (!processedData) return;

    const destroyChart = (ref: React.RefObject<HTMLCanvasElement>) => {
      const canvas = ref.current;
      if (canvas && chartInstances.current.has(canvas)) {
        const existingChart = chartInstances.current.get(canvas);
        if (existingChart) {
          existingChart.destroy();
          chartInstances.current.delete(canvas);
        }
      }
    };

    // 1. Revenue Comparison (Doughnut)
    if (revenueComparisonChartRef.current) {
      destroyChart(revenueComparisonChartRef);
      const ctx = revenueComparisonChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: processedData.revenueComparisonLabels,
            datasets: [{
              data: processedData.revenueComparisonData,
              backgroundColor: processedData.revenueComparisonColors,
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            ...CHART_COMMON_OPTIONS,
            cutout: '70%',
            plugins: {
              ...CHART_COMMON_OPTIONS.plugins,
              legend: {
                position: 'bottom',
                labels: {
                  padding: 20,
                  usePointStyle: true
                }
              }
            }
          }
        });
        chartInstances.current.set(revenueComparisonChartRef.current, chart);
      }
    }

    // 2. Shop Revenue (Doughnut)
    if (revenueChartRef.current && processedData.pieChartLabels.length > 0) {
      destroyChart(revenueChartRef);
      const ctx = revenueChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: processedData.pieChartLabels,
            datasets: [{
              data: processedData.pieChartValues,
              backgroundColor: [COLOR_PALETTE.navyBlue, COLOR_PALETTE.orangeYellow, COLOR_PALETTE.lightOrange],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            ...CHART_COMMON_OPTIONS,
            cutout: '70%',
            plugins: {
              ...CHART_COMMON_OPTIONS.plugins,
              legend: { position: 'bottom' }
            }
          }
        });
        chartInstances.current.set(revenueChartRef.current, chart);
      }
    }

    // 3. Monthly Trend (Line Chart) - Show if data exists
    if (trendChartRef.current && processedData.monthlyBusinessGrowth.length > 0) {
      destroyChart(trendChartRef);
      const ctx = trendChartRef.current.getContext('2d');
      if (ctx) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Parse string data to numbers
        const datasets = processedData.monthlyBusinessGrowth.map(dataset => ({
          ...dataset,
          data: dataset.data.map((d: any) => parseNumber(d)),
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6
        }));

        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: months,
            datasets
          },
          options: {
            ...CHART_COMMON_OPTIONS,
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#1E293B' }
              },
              y: {
                ticks: {
                  color: '#1E293B',
                  callback: function (value) {
                    return 'Ksh ' + formatNumber(Number(value));
                  }
                },
                grid: { color: '#F1F5F9' }
              }
            },
            interaction: { mode: 'index', intersect: false }
          }
        });
        chartInstances.current.set(trendChartRef.current, chart);
      }
    }

    // 4. Top Services (Bar)
    if (servicesChartRef.current && processedData.servicesLabels.length > 0) {
      destroyChart(servicesChartRef);
      const ctx = servicesChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: processedData.servicesLabels,
            datasets: [{
              data: processedData.servicesCounts,
              backgroundColor: COLOR_PALETTE.navyBlue,
              borderRadius: 4,
              barThickness: 12
            }]
          },
          options: {
            ...CHART_COMMON_OPTIONS,
            indexAxis: 'y',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `Count: ${ctx.raw}`
                }
              }
            },
            scales: {
              x: {
                display: false,
                grid: { display: false }
              },
              y: {
                grid: { display: false },
                ticks: {
                  color: '#1E293B',
                  font: { size: 11 }
                }
              }
            }
          }
        });
        chartInstances.current.set(servicesChartRef.current, chart);
      }
    }

    // 5. Top Items (Bar)
    if (productsChartRef.current && processedData.itemLabels.length > 0) {
      destroyChart(productsChartRef);
      const ctx = productsChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: processedData.itemLabels,
            datasets: [{
              data: processedData.itemCounts,
              backgroundColor: COLOR_PALETTE.orangeYellow,
              borderRadius: 4,
              barThickness: 12
            }]
          },
          options: {
            ...CHART_COMMON_OPTIONS,
            indexAxis: 'y',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `Count: ${ctx.raw}`
                }
              }
            },
            scales: {
              x: {
                display: false,
                grid: { display: false }
              },
              y: {
                grid: { display: false },
                ticks: {
                  color: '#1E293B',
                  font: { size: 11 }
                }
              }
            }
          }
        });
        chartInstances.current.set(productsChartRef.current, chart);
      }
    }

    // 6. Payment Type Chart (Doughnut)
    if (paymentTypeChartRef.current && processedData.paymentTypeChartData.some(v => v > 0)) {
      destroyChart(paymentTypeChartRef);
      const ctx = paymentTypeChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: processedData.paymentTypeChartLabels,
            datasets: [{
              data: processedData.paymentTypeChartData,
              backgroundColor: processedData.paymentTypeChartColors,
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            ...CHART_COMMON_OPTIONS,
            cutout: '60%',
            plugins: {
              ...CHART_COMMON_OPTIONS.plugins,
              legend: {
                position: 'right',
                labels: {
                  padding: 15,
                  usePointStyle: true,
                  boxWidth: 8
                }
              }
            }
          }
        });
        chartInstances.current.set(paymentTypeChartRef.current, chart);
      }
    }

    return () => {
      chartInstances.current.forEach(chart => chart.destroy());
      chartInstances.current.clear();
    };
  }, [processedData]);

  // --- Handlers ---
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  }, []);

  const handleReset = useCallback(() => {
    setStartDate("");
    setEndDate("");
  }, []);

  // --- Render ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 text-lg">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw className="h-5 w-5" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!processedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">No dashboard data could be loaded</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalOrders = parseNumber(processedData.shopA?.total_orders || 0) +
    parseNumber(processedData.shopB?.total_orders || 0) +
    processedData.hotelTotalOrders;

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Business Performance Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              {startDate || endDate
                ? `Date Range: ${startDate || 'Start'} to ${endDate || 'End'}`
                : 'Real-time business analytics'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
          <Filter className="h-5 w-5 text-blue-500" />
          <span className="font-semibold text-gray-700">
            {startDate || endDate ? 'Custom Range' : 'All Time'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              max={today}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              max={today}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 md:col-span-2">
            <button
              onClick={() => fetchData()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-5 w-5" /> Apply Filters
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Filter className="h-5 w-5" /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Business Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={<Wallet className="h-5 w-5 text-blue-600" />}
          bg="blue"
          title="Total Revenue"
          value={`Ksh ${formatCurrencyFull(processedData.totalBusinessRevenue)}`}
          subtitle="Combined earnings"
        />
        <StatCard
          icon={<ChartLine className="h-5 w-5 text-green-600" />}
          bg="green"
          title="Net Profit"
          value={`Ksh ${formatCurrencyFull(processedData.totalNetProfit)}`}
          subtitle="After expenses"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5 text-red-600" />}
          bg="red"
          title="Total Expenses"
          value={`Ksh ${formatCurrencyFull(processedData.totalBusinessExpenses)}`}
          subtitle="Combined expenses"
        />
        <StatCard
          icon={<ShoppingBag className="h-5 w-5 text-purple-600" />}
          bg="purple"
          title="Total Orders"
          value={formatNumber(totalOrders)}
          subtitle="All businesses"
        />
      </div>

      {/* Revenue Comparison & Hotel Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Revenue Comparison</h2>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
              Total: Ksh {formatCurrencyFull(processedData.totalBusinessRevenue)}
            </span>
          </div>
          <div className="h-64">
            <canvas ref={revenueComparisonChartRef} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-semibold text-blue-700">Laundry Business</div>
              <div className="text-lg font-bold text-blue-900">Ksh {formatCurrencyFull(processedData.laundryRevenue)}</div>
              <div className="text-xs text-blue-600 mt-1">
                {formatNumber(parseNumber(processedData.shopA?.total_orders || 0) + parseNumber(processedData.shopB?.total_orders || 0))} orders
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-sm font-semibold text-red-700">Hotel Business</div>
              <div className="text-lg font-bold text-red-900">Ksh {formatCurrencyFull(processedData.hotelRevenue)}</div>
              <div className="text-xs text-red-600 mt-1">
                {formatNumber(processedData.hotelTotalOrders)} orders
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-gradient-to-b from-red-500 to-orange-600 rounded-full"></div>
              <h2 className="text-lg font-bold text-gray-900">Hotel Business</h2>
            </div>
            <Utensils className="h-5 w-5 text-orange-500" />
          </div>
          <div className="space-y-4">
            <MetricBox
              label="Revenue"
              value={`Ksh ${formatCurrencyFull(processedData.hotelRevenue)}`}
              sub={`${formatNumber(processedData.hotelTotalOrders)} orders`}
              color="red"
              icon={<Wallet className="h-5 w-5" />}
            />
            <MetricBox
              label="Orders"
              value={formatNumber(processedData.hotelTotalOrders)}
              sub="Total hotel orders"
              color="orange"
              icon={<ShoppingBag className="h-5 w-5" />}
            />
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-3 mb-2">
                <ChartLine className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-gray-700">Profit & Expenses</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-lg font-bold text-green-600">Ksh {formatCurrencyFull(processedData.hotelNetProfit)}</div>
                  <div className="text-xs text-gray-500">Profit</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">Ksh {formatCurrencyFull(processedData.hotelTotalExpenses)}</div>
                  <div className="text-xs text-gray-500">Expenses</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Laundry Business Stats */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full"></div>
          <h2 className="text-xl font-bold text-gray-900">Laundry Business</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Revenue</h3>
                <div className="text-xl font-bold text-gray-900">
                  Ksh {formatCurrencyFull(processedData.laundryRevenue)}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Breakdown</h4>
              <div className="h-48">
                <canvas ref={paymentTypeChartRef} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Payments Status</h3>
                <div className="text-xl font-bold text-gray-900">
                  Ksh {formatCurrencyFull(processedData.totalCollectedAmount)}
                </div>
                <div className="text-xs text-gray-500">Collected</div>
              </div>
            </div>
            <div className="space-y-3 mt-4">
              <PaymentStatusBadge
                label="Pending"
                count={processedData.pendingPayments}
                amount={processedData.totalPendingAmount}
                status="pending"
                icon={<Clock className="h-3 w-3" />}
              />
              <PaymentStatusBadge
                label="Partial"
                count={processedData.partialPayments}
                amount={processedData.totalPartialAmount}
                status="partial"
                icon={<AlertCircle className="h-3 w-3" />}
              />
              <PaymentStatusBadge
                label="Complete"
                count={processedData.completePayments}
                amount={processedData.totalCompleteAmount}
                status="complete"
                icon={<CheckCircle className="h-3 w-3" />}
              />
              <PaymentStatusBadge
                label="Overdue"
                count={processedData.overduePayments}
                amount={processedData.totalOverdueAmount}
                status="overdue"
                icon={<AlertCircle className="h-3 w-3" />}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Expenses</h3>
                  <div className="text-xl font-bold text-gray-900">
                    Ksh {formatCurrencyFull(processedData.totalExpenses)}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="text-sm text-blue-700">Shop A</span>
                <span className="font-bold text-blue-900">Ksh {formatCurrencyFull(processedData.shopAExpenses)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                <span className="text-sm text-orange-700">Shop B</span>
                <span className="font-bold text-orange-900">Ksh {formatCurrencyFull(processedData.shopBExpenses)}</span>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-500 mt-4">
              <ChartLine className="h-3 w-3 text-red-500 mr-1" />
              <span>Operational costs breakdown</span>
            </div>
          </div>
        </div>

        {/* Shop Performance Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ShopPerformanceCard title="Shop A" metrics={processedData.shopA} />
          <ShopPerformanceCard title="Shop B" metrics={processedData.shopB} />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Revenue Distribution by Shop</h2>
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">Laundry Only</span>
          </div>
          <div className="h-64">
            {processedData.pieChartLabels.length > 0 ? (
              <canvas ref={revenueChartRef} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No revenue data available
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Revenue Trend</h2>
            <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-semibold">Monthly</span>
          </div>
          <div className="h-64">
            {processedData.monthlyBusinessGrowth?.length > 0 ? (
              <canvas ref={trendChartRef} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No trend data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard
          title="Top Services"
          color="green"
          icon={<Bath className="h-5 w-5" />}
          canvasRef={servicesChartRef}
          dataAvailable={processedData.servicesLabels.length > 0}
        />
        <ChartCard
          title="Common Items"
          color="yellow"
          icon={<Box className="h-5 w-5" />}
          canvasRef={productsChartRef}
          dataAvailable={processedData.itemLabels.length > 0}
        />

        <div className="bg-white rounded-xl p-6 shadow-sm border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-500" />
              Top Customers
            </h2>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
              {processedData.commonCustomers.length} customers
            </span>
          </div>
          <div className="h-72 overflow-y-auto pr-2">
            {processedData.commonCustomers.length > 0 ? processedData.commonCustomers.map((c, i) => (
              <div key={i} className="flex items-center p-4 bg-gray-50 rounded-lg mb-3 hover:bg-gray-100 transition">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold mr-4">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{c.name}</div>
                  <div className="text-xs text-gray-500 truncate">{c.phone}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-pink-600">Ksh {formatCurrency(c.spent)}</div>
                  <div className="text-xs text-gray-500">{c.orders} orders</div>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <Users className="h-12 w-12 mb-2 opacity-50" />
                <p>No customer data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods Table */}
      {processedData.paymentMethods.length > 0 && (
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Payment Methods Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Payment Method</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Transactions</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount Collected</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {processedData.paymentMethods.map((method, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${method.name === 'Cash' ? 'bg-green-100 text-green-800' :
                          method.name === 'Mpesa' ? 'bg-blue-100 text-blue-800' :
                            method.name === 'Card' ? 'bg-purple-100 text-purple-800' :
                              method.name === 'Not Paid' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {method.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{formatNumber(method.count)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-green-600">Ksh {formatCurrencyFull(method.amount)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-700">Ksh {formatCurrencyFull(method.totalAmount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 text-red-700 p-4 rounded-lg shadow-lg flex justify-between items-center z-50 max-w-md">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-900 font-bold ml-4">✕</button>
        </div>
      )}
    </div>
  );
}

// --- Optimized Sub-Components ---

const StatCard = memo(({ icon, bg, title, value, subtitle }: {
  icon: React.ReactNode,
  bg: 'blue' | 'purple' | 'red' | 'green' | 'orange',
  title: string,
  value: string,
  subtitle: string
}) => {
  const classes = STYLE_MAPS.card[bg];
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${classes.split(' ')[0]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`${classes} text-xs font-semibold px-2 py-1 rounded-full capitalize`}>
          Total
        </span>
      </div>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
      <div className="text-xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="flex items-center text-xs text-gray-500">
        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
        <span>{subtitle}</span>
      </div>
    </div>
  );
});

const MetricBox = memo(({ label, value, sub, color, icon }: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ReactNode
}) => {
  const classes = STYLE_MAPS.metric[color as keyof typeof STYLE_MAPS.metric] || STYLE_MAPS.metric.blue;

  return (
    <div className={`bg-gradient-to-br ${classes} rounded-lg p-4 border hover:shadow-sm transition`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900 mb-1">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
});

const PaymentStatusBadge = memo(({ label, count, amount, status, icon }: {
  label: string;
  count?: number;
  amount?: number;
  status: 'pending' | 'partial' | 'complete' | 'overdue';
  icon: React.ReactNode;
}) => {
  const classes = STYLE_MAPS.status[status];

  return (
    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
      <div className="flex items-center gap-2">
        <span className={`${classes} px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
          {icon}
          <span>{count || 0}</span>
        </span>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className={`text-xs font-medium ${amount ? 'text-gray-900' : 'text-gray-500'}`}>
        {amount ? `Ksh ${formatCurrency(amount)}` : 'Ksh 0'}
      </span>
    </div>
  );
});

const ShopPerformanceCard = memo(({ title, metrics }: { title: string, metrics?: any }) => {
  if (!metrics) return null;

  // Helper to safely access and parse metrics
  const getMetric = (key: string, defaultVal = 0) => {
    const value = metrics?.[key];
    return value !== undefined ? parseNumber(value) : defaultVal;
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-900">{title} Performance</h2>
        </div>
        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
          Ksh {formatCurrencyFull(getMetric('revenue'))}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricBox
          label="Revenue"
          value={`Ksh ${formatCurrencyFull(getMetric('revenue'))}`}
          sub={`${title} earnings`}
          color="blue"
          icon={<Wallet className="h-5 w-5 text-gray-600" />}
        />
        <MetricBox
          label="Orders"
          value={`${formatNumber(getMetric('total_orders'))}`}
          sub="Total orders"
          color="blue"
          icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
        />
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-semibold text-gray-700">Payments</span>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-yellow-600">{getMetric('pending_payments')} pending</span>
              <span className="text-yellow-600">Ksh {formatCurrency(getMetric('total_pending_amount'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">{getMetric('partial_payments')} partial</span>
              <span className="text-blue-600">Ksh {formatCurrency(getMetric('total_partial_amount'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">{getMetric('complete_payments')} complete</span>
              <span className="text-green-600">Ksh {formatCurrency(getMetric('total_complete_amount'))}</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-3 mb-2">
            <ChartLine className="h-5 w-5 text-green-600" />
            <span className="text-sm font-semibold text-gray-700">Profit & Expenses</span>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <div className="text-md font-bold text-green-600">Ksh {formatCurrencyFull(getMetric('net_profit'))}</div>
              <div className="text-xs text-gray-500">Profit</div>
            </div>
            <div>
              <div className="text-md font-bold text-blue-600">Ksh {formatCurrencyFull(getMetric('total_expenses'))}</div>
              <div className="text-xs text-gray-500">Expenses</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const ChartCard = memo(({ title, icon, canvasRef, dataAvailable, color = "gray" }: {
  title: string,
  icon: React.ReactNode,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  dataAvailable: boolean,
  color?: 'green' | 'yellow' | 'gray' | 'blue' | 'red' | 'purple'
}) => {
  const titleColorClass = STYLE_MAPS.chartTitle[color] || STYLE_MAPS.chartTitle.gray;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          {icon}
          <span className={titleColorClass}>{title}</span>
        </h2>
      </div>
      <div className="h-72">
        {dataAvailable ? (
          <canvas ref={canvasRef} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            {icon}
            <p className="mt-2">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
});
