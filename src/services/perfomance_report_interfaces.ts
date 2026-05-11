// Interfaces
export interface HotelOrderItem {
  id: number;
  food_item_name: string;
  total_price: number;
  quantity: number;
  price: string;
  name: string | null;
  oncredit: boolean;
  created_at: string | null;
  order: number;
  food_item: number;
}

export interface HotelOrder {
  id: number;
  order_items: HotelOrderItem[];
  total_amount: number;
  created_by: {
    email: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

export interface HotelExpense {
  id: number;
  field: {
    id: number;
    label: string;
    created_at: string;
  };
  amount: string;
  date: string;
  notes: string | null;
}

export interface LaundryOrderItem {
  id: number;
  servicetype: string[];
  itemtype: string;
  itemname: string;
  quantity: number;
  itemcondition: string;
  additional_info: string | null;
  unit_price: string;
  total_item_price: string;
  created_at: string;
}

export interface LaundryOrder {
  id: number;
  uniquecode: string;
  customer: {
    id: number;
    name: string;
    phone: string;
    created_by: any;
  };
  payment_type: string;
  payment_status: "pending" | "partial" | "complete";
  shop: "Shop A" | "Shop B";
  delivery_date: string;
  order_status: string;
  addressdetails: string;
  amount_paid: string;
  total_price: string;
  balance: string;
  created_at: string;
  updated_at: string;
  created_by: any;
  updated_by: any;
  items: LaundryOrderItem[];
}

export interface LaundryExpense {
  id: number;
  field: {
    id: number;
    label: string;
    created_at: string;
  };
  shop: "Shop A" | "Shop B";
  amount: string;
  date: string;
  notes: string | null;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  created_by: any;
}

export interface TopCustomer {
  customerName: string;
  orderCount: number;
  totalSpent: number;
}

export interface ProcessedData {
  // Summary Stats
  totalBusinessRevenue: number;
  totalNetProfit: number;
  totalBusinessExpenses: number;

  // Hotel Stats
  hotelRevenue: number;
  hotelTotalOrders: number;
  hotelNetProfit: number;
  hotelTotalExpenses: number;

  // Laundry Stats
  laundryRevenue: number;
  cashPaymentsAmount: number;
  cardPaymentsAmount: number;
  bankTransferPaymentsAmount: number;
  otherPaymentsAmount: number;
  nonePaymentsAmount: number;
  totalBalanceAmount: number;
  pendingPayments: number;
  totalPendingAmount: number;
  partialPayments: number;
  totalPartialAmount: number;
  completePayments: number;
  totalCompleteAmount: number;
  totalExpenses: number;

  // Shop Stats
  shopARevenue: number;
  shopATotalOrders: number;
  shopAPendingPayments: number;
  shopAPendingAmount: number;
  shopAPartialPayments: number;
  shopAPartialAmount: number;
  shopACompletePayments: number;
  shopACompleteAmount: number;
  shopANetProfit: number;
  shopATotalExpenses: number;

  shopBRevenue: number;
  shopBTotalOrders: number;
  shopBPendingPayments: number;
  shopBPendingAmount: number;
  shopBPartialPayments: number;
  shopBPartialAmount: number;
  shopBCompletePayments: number;
  shopBCompleteAmount: number;
  shopBNetProfit: number;
  shopBTotalExpenses: number;

  // Chart Data
  revenueComparisonLabels: string[];
  revenueComparisonData: number[];
  revenueComparisonColors: string[];

  pieChartLabels: string[];
  pieChartValues: number[];

  lineChartData: Array<{
    label: string;
    months: string[];
    data: number[];
  }>;

  servicesLabels: string[];
  servicesCounts: number[];

  itemLabels: string[];
  itemCounts: number[];

  commonCustomers: TopCustomer[];

  // Monthly Data
  monthlyData: Array<{
    month: string;
    year: number;
    hotelRevenue: number;
    laundryRevenue: number;
    totalRevenue: number;
    hotelExpenses: number;
    laundryExpenses: number;
    totalExpenses: number;
    netProfit: number;
  }>;

  // Payment Methods
  paymentMethods: Array<{
    name: string;
    amount: number;
    count: number;
  }>;

  currentYear: number;
  selectedMonth?: number;
}
