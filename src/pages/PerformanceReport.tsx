import { useState, useEffect, useCallback, useRef, useMemo, memo, useReducer } from "react";
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
  AlertCircle,
  CalendarRange,
  ChevronDown
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
      cancelled_payments?: number;
      total_pending_amount: number;
      total_partial_amount: number;
      total_complete_amount: number;
      total_cancelled_amount?: number;
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
    combined_summary?: {
      hotel_revenue: number;
      laundry_revenue: number;
      combined_revenue: number;
      transaction_count: number;
    };
    revenue_by_shop?: Array<{ shop: string; total_revenue: string; paid: string; bal: string }>;
    balance_by_shop?: Array<{ shop: string; total_balance: string }>;
    common_customers?: Array<{ customer__name: string; customer__phone: string; count: string; spent: string }>;
    top_services?: Array<{ servicetype: string; count: string; revenue?: string | number }>;
    common_items?: Array<{ itemname: string; count: string }>;
    monthly_business_growth?: Array<{
      label: string;
      data: number[];
      borderColor: string;
      fill?: string | boolean;
      borderDash?: number[];
    }>;
    trend_labels?: string[];
    shop_a_stats?: {
      revenue: number;
      total_orders: number;
      pending_orders: number;
      completed_orders: number;
      pending_payments: number;
      partial_payments: number;
      complete_payments: number;
      cancelled_payments?: number;
      total_pending_amount: number;
      total_partial_amount: number;
      total_complete_amount: number;
      total_cancelled_amount?: number;
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
      cancelled_payments?: number;
      total_pending_amount: number;
      total_partial_amount: number;
      total_complete_amount: number;
      total_cancelled_amount?: number;
      total_balance: number;
      total_amount_paid: number;
      total_expenses: number;
      net_profit: number;
    };
    payment_methods?: Array<{
      payment_type: string;
      count: string;
      total: string;
      order_total?: string;
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

const currentMonthRange = () => {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };
};

type BusinessFilter = "all" | "laundry" | "hotel";
type PaymentMethodFilter = "all" | "cash" | "mpesa" | "card";
type StatusFilter = "all" | "paid" | "pending" | "partial" | "cancelled";
type FilterPreset = "this-month" | "year" | "custom" | "all-years";

interface FilterState {
  startDate: string;
  endDate: string;
  year: number | "all";
  business: BusinessFilter;
  paymentMethod: PaymentMethodFilter;
  status: StatusFilter;
  preset: FilterPreset;
}

type FilterAction =
  | { type: "SET_ALL"; payload: FilterState }
  | { type: "PATCH"; payload: Partial<FilterState> }
  | { type: "RESET"; payload: FilterState };

const getCurrentYear = () => new Date().getFullYear();

const getYearRange = (year: number) => ({
  startDate: `${year}-01-01`,
  endDate: `${year}-12-31`,
});

const createDefaultFilters = (): FilterState => {
  const range = currentMonthRange();
  return {
    startDate: range.start,
    endDate: range.end,
    year: getCurrentYear(),
    business: "all",
    paymentMethod: "all",
    status: "all",
    preset: "this-month",
  };
};

const createAllYearsFilters = (): FilterState => ({
  startDate: "",
  endDate: "",
  year: "all",
  business: "all",
  paymentMethod: "all",
  status: "all",
  preset: "all-years",
});

function filtersReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "SET_ALL":
      return action.payload;
    case "PATCH":
      return { ...state, ...action.payload };
    case "RESET":
      return action.payload;
    default:
      return state;
  }
}

const formatRangeLabel = (startDate: string, endDate: string) =>
  startDate || endDate
    ? `Selected period: ${startDate || "Start"} to ${endDate || "End"}`
    : "Selected period: All years";

// --- Main Component ---

export default function PerformanceReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaultFilters = useMemo(() => createDefaultFilters(), []);
  const [filters, dispatchFilters] = useReducer(filtersReducer, defaultFilters);

  // State to hold full dashboard response
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  // Chart Refs
  const revenueComparisonChartRef = useRef<HTMLCanvasElement>(null);
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const trendChartRef = useRef<HTMLCanvasElement>(null);
  const servicesChartRef = useRef<HTMLCanvasElement>(null);
  const productsChartRef = useRef<HTMLCanvasElement>(null);
  const paymentTypeChartRef = useRef<HTMLCanvasElement>(null);

  const chartInstances = useRef<Map<HTMLCanvasElement, ChartType>>(new Map());
  const updateIntervalRef = useRef<NodeJS.Timeout>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const skipDebounceRef = useRef(false);

  // --- Data Fetching ---
  const fetchData = useCallback(async (activeFilters: FilterState) => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams();
      if (activeFilters.startDate) params.append('start_date', activeFilters.startDate);
      if (activeFilters.endDate) params.append('end_date', activeFilters.endDate);
      params.append('business', activeFilters.business);
      params.append('payment_method', activeFilters.paymentMethod);
      params.append('status', activeFilters.status);
      if (activeFilters.year !== "all") {
        params.append('year', String(activeFilters.year));
      }

      const queryString = params.toString();
      const url = `${API_BASE_URL}/Report/dashboard/${queryString ? '?' + queryString : ''}`;

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
  }, []);

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      fetchData(filters);
    }, 300);
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [fetchData, filters]);

  const applyFiltersImmediately = useCallback((nextFilters: FilterState) => {
    skipDebounceRef.current = true;
    dispatchFilters({ type: "SET_ALL", payload: nextFilters });
    void fetchData(nextFilters);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(filters), 60000);
    updateIntervalRef.current = interval;

    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, [fetchData, filters]);

  // --- Data Processing ---

  const processedData = useMemo(() => {
    if (!dashboardData?.data) return null;

    const data = dashboardData.data;
    const { order_stats, payment_stats, expense_stats, hotel_stats, business_growth, payment_type_stats } = data;

    // Basic metrics with safe access using parseNumber helper
    const totalBusinessRevenue = parseNumber(data.combined_summary?.combined_revenue || business_growth?.total_revenue || 0);
    const totalNetProfit = parseNumber(business_growth?.net_profit || 0);
    const totalBusinessExpenses = parseNumber(business_growth?.total_expenses || 0);

    const hotelRevenue = parseNumber(data.combined_summary?.hotel_revenue || hotel_stats?.total_revenue || 0);
    const laundryRevenue = parseNumber(data.combined_summary?.laundry_revenue || order_stats?.total_revenue || 0);
    const hotelTotalOrders = parseNumber(hotel_stats?.total_orders || 0);
    const hotelNetProfit = parseNumber(hotel_stats?.net_profit || 0);
    const hotelTotalExpenses = parseNumber(hotel_stats?.total_expenses || 0);

    // Payment methods from payment_type_stats
    const paymentMethods = (data.payment_methods || []).map(method => ({
      name: method.payment_type || 'Unknown',
      amount: parseNumber(method.total) || 0,
      count: parseNumber(method.count) || 0,
      totalAmount: parseNumber(method.order_total ?? method.total) || 0
    })).filter(p => p.count > 0 || p.amount > 0);

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
    const paymentTypeChartLabels = paymentMethodsData.map(item => item.payment_type || 'Unknown');
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
      transactionCount: parseNumber(data.combined_summary?.transaction_count || business_growth?.total_orders || 0),
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
      cancelledPayments: parseNumber(payment_stats?.cancelled_payments) || 0,
      totalCancelledAmount: parseNumber(payment_stats?.total_cancelled_amount) || 0,
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
      trendLabels: data.trend_labels || [],

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
        const labels = processedData.trendLabels?.length
          ? processedData.trendLabels.map((label: string) => {
              const date = new Date(label);
              return Number.isFinite(date.getTime())
                ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : label;
            })
          : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
            labels,
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
  const handleDateRangeApply = useCallback((startDate: string, endDate: string) => {
    applyFiltersImmediately({
      ...filters,
      startDate,
      endDate,
      year: new Date(startDate || endDate || Date.now()).getFullYear(),
      preset: "custom",
    });
  }, [applyFiltersImmediately, filters]);

  const handleThisMonth = useCallback(() => {
    const range = currentMonthRange();
    applyFiltersImmediately({
      ...filters,
      ...range,
      year: getCurrentYear(),
      preset: "this-month",
    });
  }, [applyFiltersImmediately, filters]);

  const handleYearChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value;
    if (nextValue === "all") {
      applyFiltersImmediately({
        ...filters,
        year: "all",
        startDate: "",
        endDate: "",
        preset: "all-years",
      });
      return;
    }

    const nextYear = Number(nextValue);
    const isCurrentYear = nextYear === getCurrentYear();
    const nextRange = filters.preset === "this-month" && isCurrentYear
      ? currentMonthRange()
      : getYearRange(nextYear);

    applyFiltersImmediately({
      ...filters,
      year: nextYear,
      startDate: nextRange.startDate,
      endDate: nextRange.endDate,
      preset: isCurrentYear && filters.preset === "this-month" ? "this-month" : "year",
    });
  }, [applyFiltersImmediately, filters]);

  const handleBusinessChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    applyFiltersImmediately({
      ...filters,
      business: event.target.value as BusinessFilter,
    });
  }, [applyFiltersImmediately, filters]);

  const handleReset = useCallback(() => {
    applyFiltersImmediately(createAllYearsFilters());
  }, [applyFiltersImmediately]);

  const isThisMonthActive = useMemo(() => {
    const range = currentMonthRange();
    return filters.startDate === range.start && filters.endDate === range.end && filters.preset === "this-month";
  }, [filters.endDate, filters.preset, filters.startDate]);

  const yearOptions = useMemo(
    () => ["all" as const, ...Array.from({ length: 4 }, (_, index) => getCurrentYear() - index)],
    []
  );

  // --- Render ---
  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-[12px] text-slate-600">Loading performance report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mb-2 text-[14px] font-medium text-slate-900">Error Loading Report</h2>
          <p className="mb-4 text-[12px] text-slate-600">{error}</p>
          <button
            onClick={() => fetchData(filters)}
            className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-[12px] font-medium text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-5 w-5" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!processedData) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="mb-2 text-[14px] font-medium text-slate-900">No Data Available</h2>
          <p className="text-[12px] text-slate-600">No performance data could be loaded.</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalOrders = parseNumber(processedData.shopA?.total_orders || 0) +
    parseNumber(processedData.shopB?.total_orders || 0) +
    processedData.hotelTotalOrders;
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <div className="h-6 w-1 rounded-full bg-slate-400"></div>
          <div>
            <h1 className="text-[18px] font-medium text-slate-900">Performance Report</h1>
            <p className="mt-1 text-[11px] text-slate-500">
              {formatRangeLabel(filters.startDate, filters.endDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-600">
            {filters.business === "all" ? "All Revenue" : `${filters.business} only`}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-[14px] font-medium text-slate-900">Filter Data</h2>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <button
            onClick={handleThisMonth}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-[12px] font-medium transition ${
              isThisMonthActive
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            This month
          </button>

          <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            onApply={handleDateRangeApply}
          />

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-700">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">Year</span>
            <select
              value={filters.year}
              onChange={handleYearChange}
              className="bg-transparent pr-5 outline-none"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year === "all" ? "All years" : year}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-700">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">Business</span>
            <select
              value={filters.business}
              onChange={handleBusinessChange}
              className="bg-transparent pr-5 outline-none"
            >
              <option value="all">All</option>
              <option value="laundry">Laundry</option>
              <option value="hotel">Hotel</option>
            </select>
          </label>

          <button
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" /> Clear filters
          </button>

          {loading ? (
            <div className="inline-flex items-center gap-2 text-[11px] text-slate-500">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Updating report...
            </div>
          ) : null}
        </div>
      </div>

      {/* Business Overview Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-4 w-4 text-slate-800" />}
          bg="blue"
          title="Combined Total"
          value={`Ksh ${formatCurrencyFull(processedData.totalBusinessRevenue)}`}
          subtitle="Hotel + Laundry"
        />
        <StatCard
          icon={<Utensils className="h-4 w-4 text-blue-700" />}
          bg="green"
          title="Hotel Revenue"
          value={`Ksh ${formatCurrencyFull(processedData.hotelRevenue)}`}
          subtitle="Selected period"
        />
        <StatCard
          icon={<Bath className="h-4 w-4 text-teal-700" />}
          bg="red"
          title="Laundry Revenue"
          value={`Ksh ${formatCurrencyFull(processedData.laundryRevenue)}`}
          subtitle="Selected period"
        />
        <StatCard
          icon={<ShoppingBag className="h-4 w-4 text-slate-800" />}
          bg="purple"
          title="Transactions"
          value={formatNumber(processedData.transactionCount || totalOrders)}
          subtitle="Orders and tickets"
        />
      </div>

      {/* Revenue Comparison & Hotel Stats */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[14px] font-medium text-slate-900">Combined Revenue Mix</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
              Total: Ksh {formatCurrencyFull(processedData.totalBusinessRevenue)}
            </span>
          </div>
          <div className="h-64">
            <canvas ref={revenueComparisonChartRef} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-[12px] font-medium text-blue-700">Laundry Business</div>
              <div className="text-[20px] font-medium text-blue-900">Ksh {formatCurrencyFull(processedData.laundryRevenue)}</div>
              <div className="mt-1 text-[11px] text-blue-600">
                {formatNumber(parseNumber(processedData.shopA?.total_orders || 0) + parseNumber(processedData.shopB?.total_orders || 0))} orders
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-[12px] font-medium text-red-700">Hotel Business</div>
              <div className="text-[20px] font-medium text-red-900">Ksh {formatCurrencyFull(processedData.hotelRevenue)}</div>
              <div className="mt-1 text-[11px] text-red-600">
                {formatNumber(processedData.hotelTotalOrders)} orders
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-white p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 rounded-full bg-blue-500"></div>
              <h2 className="text-[14px] font-medium text-slate-900">Hotel Revenue</h2>
            </div>
            <Utensils className="h-4 w-4 text-blue-500" />
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3 mb-2">
                <ChartLine className="h-4 w-4 text-slate-600" />
                <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">Profit & Expenses</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-[12px] font-medium text-green-600">Ksh {formatCurrencyFull(processedData.hotelNetProfit)}</div>
                  <div className="text-[11px] text-slate-500">Profit</div>
                </div>
                <div>
                  <div className="text-[12px] font-medium text-blue-600">Ksh {formatCurrencyFull(processedData.hotelTotalExpenses)}</div>
                  <div className="text-[11px] text-slate-500">Expenses</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Laundry Business Stats */}
      <div className="mb-6 border-t border-slate-200 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-1 rounded-full bg-teal-500"></div>
          <h2 className="text-[14px] font-medium text-slate-900">Laundry Revenue</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div className="rounded-lg border border-teal-200 bg-white p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">Revenue</h3>
                <div className="text-[20px] font-medium text-slate-900">
                  Ksh {formatCurrencyFull(processedData.laundryRevenue)}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h4 className="mb-3 text-[12px] font-medium text-slate-500">Payment Methods</h4>
              <div className="h-48">
                {processedData.paymentTypeChartData.some((value: number) => value > 0) ? (
                  <canvas ref={paymentTypeChartRef} />
                ) : (
                  <EmptyState icon={<CreditCard className="h-5 w-5" />} message="No payment method data for this period." />
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">Payment Status</h3>
                <div className="text-[20px] font-medium text-slate-900">
                  Ksh {formatCurrencyFull(processedData.totalCollectedAmount)}
                </div>
                <div className="text-[11px] text-slate-500">Collected</div>
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
                label="Cancelled"
                count={processedData.cancelledPayments}
                amount={processedData.totalCancelledAmount}
                status="cancelled"
                icon={<AlertCircle className="h-3 w-3" />}
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

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">Expenses</h3>
                  <div className="text-[20px] font-medium text-slate-900">
                    Ksh {formatCurrencyFull(processedData.totalExpenses)}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                <span className="text-[12px] text-slate-700">Shop A</span>
                <span className="text-[12px] font-medium text-slate-900">Ksh {formatCurrencyFull(processedData.shopAExpenses)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                <span className="text-[12px] text-slate-700">Shop B</span>
                <span className="text-[12px] font-medium text-slate-900">Ksh {formatCurrencyFull(processedData.shopBExpenses)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-[11px] text-slate-500">
              <ChartLine className="mr-1 h-3 w-3 text-slate-400" />
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
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[12px] font-medium text-slate-500">Revenue Distribution by Shop</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">Laundry</span>
          </div>
          <div className="h-64">
            {processedData.pieChartLabels.length > 0 ? (
              <canvas ref={revenueChartRef} />
            ) : (
              <EmptyState icon={<Wallet className="h-5 w-5" />} message="No shop revenue data available." />
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[12px] font-medium text-slate-500">Revenue Trend</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">Daily</span>
          </div>
          <div className="h-64">
            {processedData.monthlyBusinessGrowth?.length > 0 ? (
              <canvas ref={trendChartRef} />
            ) : (
              <EmptyState icon={<ChartLine className="h-5 w-5" />} message="No trend data available for this period." />
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

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
              <Users className="h-5 w-5 text-yellow-500" />
              Top Customers
            </h2>
            <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
              {processedData.commonCustomers.length} customers
            </span>
          </div>
          <div className="h-72 overflow-y-auto pr-2">
            {processedData.commonCustomers.length > 0 ? processedData.commonCustomers.map((c, i) => (
              <div key={i} className="mb-2 flex items-center rounded-lg bg-slate-50 p-3">
                <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-[12px] font-medium text-white">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[12px] font-medium text-slate-900">{c.name}</div>
                  <div className="truncate text-[11px] text-slate-500">{c.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-medium text-teal-700">Ksh {formatCurrency(c.spent)}</div>
                  <div className="text-[11px] text-slate-500">{c.orders} orders</div>
                </div>
              </div>
            )) : (
              <EmptyState icon={<Users className="h-5 w-5" />} message="No customer data available for this period." />
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods Table */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-[14px] font-medium text-slate-900">Payment Methods Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-[12px] font-medium uppercase tracking-[0.05em] text-slate-500">Payment Method</th>
                  <th className="px-4 py-3 text-left text-[12px] font-medium uppercase tracking-[0.05em] text-slate-500">Transactions</th>
                  <th className="px-4 py-3 text-left text-[12px] font-medium uppercase tracking-[0.05em] text-slate-500">Amount Collected</th>
                  <th className="px-4 py-3 text-left text-[12px] font-medium uppercase tracking-[0.05em] text-slate-500">Order Total</th>
                </tr>
              </thead>
              <tbody>
                {processedData.paymentMethods.length > 0 ? (
                  processedData.paymentMethods.map((method, i) => (
                  <tr key={i} className={`border-b border-slate-200/80 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                    <td className="px-4 py-3 text-[12px]">
                      <span className={`rounded px-2 py-1 text-[11px] font-medium ${method.name === 'Cash' ? 'bg-green-100 text-green-800' :
                          method.name === 'M-Pesa' ? 'bg-blue-100 text-blue-800' :
                            method.name === 'Card' ? 'bg-purple-100 text-purple-800' :
                              method.name === 'Not Paid' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100 text-slate-700'
                        }`}>
                        {method.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-900">
                      <span className="font-medium">{formatNumber(method.count)}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      <span className="font-medium text-teal-700">Ksh {formatCurrencyFull(method.amount)}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      <span className="font-medium text-slate-700">Ksh {formatCurrencyFull(method.totalAmount)}</span>
                    </td>
                  </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-10">
                      <EmptyState icon={<CreditCard className="h-5 w-5" />} message="No payment method activity for this period." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {error && (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-md items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 font-medium text-red-900">✕</button>
        </div>
      )}
    </div>
  );
}

// --- Optimized Sub-Components ---

const DateRangePicker = memo(({
  startDate,
  endDate,
  onApply,
}: {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setDraftStartDate(startDate);
      setDraftEndDate(endDate);
    }
  }, [endDate, isOpen, startDate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const applyDraft = () => {
    onApply(draftStartDate, draftEndDate);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-700 transition hover:bg-slate-50"
      >
        <CalendarRange className="h-4 w-4 text-slate-500" />
        <span>{startDate || endDate ? `${startDate || "Start"} - ${endDate || "End"}` : "All years"}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-[320px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-2 block text-[12px] font-medium text-slate-600">Start date</label>
              <input
                type="date"
                value={draftStartDate}
                onChange={(event) => setDraftStartDate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-[12px] font-medium text-slate-600">End date</label>
              <input
                type="date"
                value={draftEndDate}
                onChange={(event) => setDraftEndDate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyDraft}
              className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

const StatCard = memo(({ icon, bg, title, value, subtitle }: {
  icon: React.ReactNode,
  bg: 'blue' | 'purple' | 'red' | 'green' | 'orange',
  title: string,
  value: string,
  subtitle: string
}) => {
  const classes = STYLE_MAPS.card[bg];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${classes.split(' ')[0]}`}>
          {icon}
        </div>
      </div>
      <h3 className="mb-1 text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">{title}</h3>
      <div className="mb-1 text-[20px] font-medium text-slate-900">{value}</div>
      <div className="flex items-center text-[11px] text-slate-500">
        <TrendingUp className="mr-1 h-3 w-3 text-slate-400" />
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
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </div>
        <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">{label}</span>
      </div>
      <div className="mb-1 text-[20px] font-medium text-slate-900">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
});

const PaymentStatusBadge = memo(({ label, count, amount, status, icon }: {
  label: string;
  count?: number;
  amount?: number;
  status: 'pending' | 'partial' | 'complete' | 'overdue' | 'cancelled';
  icon: React.ReactNode;
}) => {
  const classes = status === 'cancelled' ? 'bg-red-100 text-red-700' : STYLE_MAPS.status[status as keyof typeof STYLE_MAPS.status];

  return (
    <div className="flex items-center justify-between rounded-md px-2 py-2 odd:bg-slate-50">
      <div className="flex items-center gap-2">
        <span className={`${classes} flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium`}>
          {icon}
          <span>{count || 0}</span>
        </span>
        <span className="text-[12px] text-slate-700">{label}</span>
      </div>
      <span className={`text-[12px] font-medium ${amount ? 'text-slate-900' : 'text-slate-500'}`}>
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-teal-500"></div>
          <h2 className="text-[14px] font-medium text-slate-900">{title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
          Ksh {formatCurrencyFull(getMetric('revenue'))}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-slate-600" />
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">Payments</span>
          </div>
          <div className="flex flex-col gap-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-amber-700">{getMetric('pending_payments')} pending</span>
              <span className="text-amber-700">Ksh {formatCurrency(getMetric('total_pending_amount'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{getMetric('partial_payments')} partial</span>
              <span className="text-slate-600">Ksh {formatCurrency(getMetric('total_partial_amount'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">{getMetric('complete_payments')} complete</span>
              <span className="text-green-600">Ksh {formatCurrency(getMetric('total_complete_amount'))}</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-3">
            <ChartLine className="h-4 w-4 text-slate-600" />
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">Profit & Expenses</span>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <div className="text-[12px] font-medium text-green-600">Ksh {formatCurrencyFull(getMetric('net_profit'))}</div>
              <div className="text-[11px] text-slate-500">Profit</div>
            </div>
            <div>
              <div className="text-[12px] font-medium text-blue-600">Ksh {formatCurrencyFull(getMetric('total_expenses'))}</div>
              <div className="text-[11px] text-slate-500">Expenses</div>
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
          {icon}
          <span className={titleColorClass}>{title}</span>
        </h2>
      </div>
      <div className="h-72">
        {dataAvailable ? (
          <canvas ref={canvasRef} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
            {icon}
            <p className="mt-2 text-[12px]">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
});

const EmptyState = memo(({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      {icon}
    </div>
    <p className="text-[12px]">{message}</p>
  </div>
));
