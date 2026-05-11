import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/services/url";
import { getAccessToken, getUserData, isAdmin } from "@/utils/auth";
import { HotelOrderItem, FoodItem, HotelOrder } from "@/services/types";
import { exportToCSV, exportToJSON } from "@/lib/exportUtils";
import { ROUTES } from '@/services/Routes'

// Import Lucide React icons
import {
  Package,
  DollarSign,
  Filter,
  RotateCw,
  Download,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  FileJson,
  UserCircle,
  FileSpreadsheet,
  CreditCard,
  ListOrdered,
  Receipt,
  Save,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Home,
  Search,
  PlusCircle,
  FileText,
  EllipsisVertical
} from "lucide-react";

// Define URLs
const ORDERS_URL = `${API_BASE_URL}/Hotel/orders/`;
const ORDER_ITEMS_URL = `${API_BASE_URL}/Hotel/order-items/`;
const FOOD_ITEMS_URL = `${API_BASE_URL}/Hotel/food-items/`;

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No access token found");
  }
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
};

// FIX: Helper function to format date as YYYY-MM-DD using LOCAL time zone
// This prevents dates from shifting to the previous month when in positive UTC timezones (e.g., Kenya +3)
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DateRange {
  start_date: string;
  end_date: string;
}

interface CreateEditOrderItemData {
  food_item: number;
  quantity: number;
  price: string;
  name?: string;
  oncredit: boolean;
}

interface OrderFormData {
  items: CreateEditOrderItemData[];
  customer_name?: string;
  oncredit: boolean;
}

// Helper functions for safe property access
const getFoodItemId = (item: HotelOrderItem | FoodItem | number): number => {
  if (typeof item === 'number') return item;
  if ('id' in item) return item.id;
  return 0;
};

const getFoodItemObject = (item: HotelOrderItem): FoodItem | null => {
  if (item.food_item && typeof item.food_item === 'object') {
    return item.food_item as FoodItem;
  }
  return null;
};

interface CreatedByUser {
  email: string;
  first_name: string;
  last_name: string;
}

interface ExtendedHotelOrderItem extends Omit<HotelOrderItem, 'created_at' | 'total_price'> {
  order_id?: number;
  created_by?: CreatedByUser;
  order_created_at?: string;
  total_price?: any;
  created_at?: any;
}

const createOrder = async (): Promise<HotelOrder> => {
  const response = await fetch(ORDERS_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
  });

  if (response.status === 401) {
    window.location.href = ROUTES.login;
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.detail || errorData.message ||
      errorData.error || JSON.stringify(errorData) || 'Failed to create order';
    throw new Error(errorMessage);
  }

  return response.json();
};

const fetchOrderItems = async (pageNumber: number, dateFilter?: DateRange): Promise<{
  items: ExtendedHotelOrderItem[],
  count: number,
  totalPages: number,
  pageSize: number
}> => {
  let url = `${ORDER_ITEMS_URL}?page=${pageNumber}`;

  if (dateFilter?.start_date) {
    url += `&start_date=${dateFilter.start_date}`;
  }
  if (dateFilter?.end_date) {
    url += `&end_date=${dateFilter.end_date}`;
  }

  const response = await fetch(url, { headers: getAuthHeaders() });

  if (response.status === 401) {
    window.location.href = ROUTES.login;
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch order items: ${response.status}`);
  }

  const apiData = await response.json();

  let items: ExtendedHotelOrderItem[] = [];
  let totalCount = 0;
  let totalPages = 1;
  let pageSize = 10;

  if (apiData.results) {
    items = apiData.results as ExtendedHotelOrderItem[];
    totalCount = apiData.total_items || apiData.count || 0;
    totalPages = apiData.total_pages || 1;
    pageSize = apiData.page_size || 10;
  } else if (Array.isArray(apiData)) {
    items = apiData as ExtendedHotelOrderItem[];
    totalCount = apiData.length;
  }

  return {
    items,
    count: totalCount,
    totalPages,
    pageSize
  };
};

const fetchFoodItems = async (): Promise<FoodItem[]> => {
  const response = await fetch(FOOD_ITEMS_URL, { headers: getAuthHeaders() });

  if (response.status === 401) {
    window.location.href = ROUTES.login;
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch food items: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.results || data.data || []);
};

const createOrderItem = async (
  orderId: number,
  data: CreateEditOrderItemData
): Promise<HotelOrderItem> => {
  const formattedData = {
    order: orderId,
    food_item: data.food_item,
    quantity: parseInt(data.quantity.toString()) || 1,
    price: parseFloat(data.price) || 0,
    name: data.oncredit ? (data.name || "") : null,
    oncredit: Boolean(data.oncredit)
  };

  const response = await fetch(ORDER_ITEMS_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(formattedData),
  });

  if (response.status === 401) {
    window.location.href = ROUTES.login;
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.detail || errorData.message ||
      errorData.error || JSON.stringify(errorData) || 'Failed to create order item';
    throw new Error(errorMessage);
  }

  return response.json();
};

const updateOrderItem = async (
  itemId: number,
  data: CreateEditOrderItemData
): Promise<HotelOrderItem> => {
  const formattedData = {
    food_item: data.food_item,
    quantity: parseInt(data.quantity.toString()) || 1,
    price: parseFloat(data.price) || 0,
    name: data.oncredit ? (data.name || "") : null,
    oncredit: Boolean(data.oncredit)
  };

  const response = await fetch(`${ORDER_ITEMS_URL}${itemId}/`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(formattedData),
  });

  if (response.status === 401) {
    window.location.href = ROUTES.login;
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.detail || errorData.message ||
      errorData.error || JSON.stringify(errorData) || 'Failed to update order item';
    throw new Error(errorMessage);
  }

  return response.json();
};

const deleteOrderItem = async (itemId: number): Promise<void> => {
  const response = await fetch(`${ORDER_ITEMS_URL}${itemId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    window.location.href = ROUTES.login;
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error('Failed to delete order item');
  }
};

const deleteOrder = async (orderId: number): Promise<void> => {
  const response = await fetch(`${ORDERS_URL}${orderId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    window.location.href = ROUTES.login;
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error('Failed to delete order');
  }
};

const fetchOrderSummary = async (dateFilter?: DateRange) => {
  let url = `${ORDERS_URL}summary/`;

  if (dateFilter?.start_date && dateFilter?.end_date) {
    url += `?start_date=${dateFilter.start_date}&end_date=${dateFilter.end_date}`;
  }

  const response = await fetch(url, { headers: getAuthHeaders() });

  if (response.status === 401) {
    window.location.href = ROUTES.login;
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch order summary: ${response.status}`);
  }

  return response.json();
};

const getCreatedByName = (item: ExtendedHotelOrderItem): string => {
  if (item.created_by && typeof item.created_by === 'object') {
    const createdBy = item.created_by as CreatedByUser;
    if (createdBy.first_name && createdBy.last_name) {
      return `${createdBy.first_name} ${createdBy.last_name}`;
    } else if (createdBy.first_name) {
      return createdBy.first_name;
    } else if (createdBy.email) {
      const emailParts = createdBy.email.split('@')[0];
      if (emailParts) {
        const nameParts = emailParts.split(/[\._-]/);
        if (nameParts.length > 0) {
          const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
          return firstName;
        }
        return emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
      }
    }
  }

  return "Unknown";
};

const formatPrice = (price: any): string => {
  if (price === null || price === undefined) return "0.00";
  const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (isNaN(numPrice)) return "0.00";
  return numPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Custom hook for date range with localStorage persistence
// FIX: Ensures start date is always the 1st of the month (handles UTC offsets correctly)
const useDateRange = () => {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    // Get 1st of current month at midnight local time
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();

    const saved = localStorage.getItem('hotelOrdersDateRange');

    // Default to 1st of month to Current day if no saved date
    const defaultRange = {
      start_date: getLocalDateString(firstDayOfMonth),
      end_date: getLocalDateString(today)
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If saved date exists but is empty or invalid, use default
        if (!parsed.start_date || !parsed.end_date) {
          return defaultRange;
        }
        return {
          start_date: parsed.start_date,
          end_date: parsed.end_date
        };
      } catch {
        return defaultRange;
      }
    }
    return defaultRange;
  });

  const updateDateRange = useCallback((newRange: Partial<DateRange>) => {
    setDateRange(prev => {
      const updated = { ...prev, ...newRange };
      localStorage.setItem('hotelOrdersDateRange', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetDateRange = useCallback(() => {
    // Reset specifically to 1st of current month -> Today
    const now = new Date();
    // Get 1st of current month
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();

    const resetRange = {
      start_date: getLocalDateString(firstDayOfMonth),
      end_date: getLocalDateString(today)
    };

    localStorage.setItem('hotelOrdersDateRange', JSON.stringify(resetRange));
    setDateRange(resetRange);
  }, []);

  return { dateRange, updateDateRange, resetDateRange };
};

export default function HotelOrderItems() {
  const [orders, setOrders] = useState<HotelOrder[]>([]);
  const [orderItems, setOrderItems] = useState<ExtendedHotelOrderItem[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<ExtendedHotelOrderItem | null>(null);
  const [formData, setFormData] = useState<OrderFormData>({
    items: [{
      food_item: 0,
      quantity: 1,
      price: "0.00",
      oncredit: false
    }],
    customer_name: "",
    oncredit: false
  });
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState({
    total_orders: 0,
    total_revenue: 0,
    credit_orders_count: 0,
    credit_orders_value: 0
  });

  const { dateRange, updateDateRange, resetDateRange } = useDateRange();
  const currentUser = useMemo(() => getUserData(), []);
  const isUserAdmin = useMemo(() => isAdmin(), []);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = ROUTES.login;
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = ROUTES.login;
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [orderItemsData, foodItemsData, summaryData] = await Promise.all([
        fetchOrderItems(page, dateRange),
        fetchFoodItems(),
        fetchOrderSummary(dateRange),
      ]);

      setOrderItems(orderItemsData.items);
      setFoodItems(foodItemsData);

      const visibleCreditOrders = orderItemsData.items.filter(item => item.oncredit);
      const visibleCreditValue = visibleCreditOrders.reduce((sum, item) => {
        const price = item.price ? parseFloat(item.price.toString()) : 0;
        return sum + price;
      }, 0);

      setSummary({
        total_orders: Number(summaryData.total_orders) || 0,
        total_revenue: Number(summaryData.total_revenue) || 0,
        credit_orders_count: Number(summaryData.credit_orders_count) || visibleCreditOrders.length,
        credit_orders_value: Number(summaryData.credit_orders_value) || visibleCreditValue
      });

      setTotalPages(orderItemsData.totalPages);
      setTotalItems(orderItemsData.count);
      setPageSize(orderItemsData.pageSize);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      if (err.message.includes("Authentication required")) {
        window.location.href = ROUTES.login;
        return;
      }
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, dateRange.start_date, dateRange.end_date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateDateRange({ start_date: e.target.value });
    setPage(1);
  }, [updateDateRange]);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateDateRange({ end_date: e.target.value });
    setPage(1);
  }, [updateDateRange]);

  const handleFilterClick = useCallback(() => {
    setPage(1);
    fetchData();
  }, [fetchData]);

  const handleResetClick = useCallback(() => {
    resetDateRange();
    setPage(1);
    fetchData();
  }, [resetDateRange, fetchData]);

  const addItemToForm = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        food_item: 0,
        quantity: 1,
        price: "0.00",
        oncredit: prev.oncredit,
        name: prev.oncredit ? prev.customer_name : ""
      }]
    }));
  }, []);

  const removeItemFromForm = useCallback((index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  }, [formData.items.length]);

  const handleItemInputChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedItems = [...formData.items];

    if (name === 'food_item') {
      const foodItemId = parseInt(value);
      updatedItems[index] = {
        ...updatedItems[index],
        food_item: foodItemId,
        price: "0.00"
      };
    } else if (name === 'quantity') {
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: parseInt(value) || 1
      };
    } else if (name === 'oncredit') {
      const isChecked = (e.target as HTMLInputElement).checked;
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: isChecked
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: value
      };
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));

    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [formData.items, formErrors]);

  const handleOrderInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const isChecked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: isChecked,
        items: prev.items.map(item => ({
          ...item,
          oncredit: isChecked,
          name: isChecked ? prev.customer_name : ""
        }))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        items: prev.items.map(item => ({
          ...item,
          name: prev.oncredit ? value : ""
        }))
      }));
    }

    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [formErrors]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    formData.items.forEach((item, index) => {
      if (!item.food_item || item.food_item === 0) {
        errors[`item_${index}_food_item`] = "Please select a food item";
      }

      if (!item.quantity || item.quantity <= 0) {
        errors[`item_${index}_quantity`] = "Quantity must be greater than 0";
      }

      if (!item.price || parseFloat(item.price) <= 0) {
        errors[`item_${index}_price`] = "Price must be greater than 0";
      }
    });

    if (formData.oncredit && (!formData.customer_name || formData.customer_name.trim() === "")) {
      errors.customer_name = "Customer name is required for credit orders";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleCreateOrder = useCallback(() => {
    setFormData({
      items: [{
        food_item: 0,
        quantity: 1,
        price: "0.00",
        oncredit: false
      }],
      customer_name: "",
      oncredit: false
    });
    setCurrentItem(null);
    setIsEditing(false);
    setFormErrors({});
    setShowCreateEditModal(true);
  }, []);

  const handleEditOrderItem = useCallback((item: ExtendedHotelOrderItem) => {
    const foodItemId = getFoodItemId(item.food_item);

    setFormData({
      items: [{
        food_item: foodItemId,
        quantity: item.quantity || 1,
        price: item.price?.toString() || "0.00",
        name: item.name || "",
        oncredit: item.oncredit || false
      }],
      customer_name: item.name || "",
      oncredit: item.oncredit || false
    });
    setCurrentItem(item);
    setIsEditing(true);
    setFormErrors({});
    setShowCreateEditModal(true);
  }, []);

  const handleSaveOrder = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = ROUTES.login;
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix form errors");
      return;
    }

    try {
      if (isEditing && currentItem) {
        const result = await updateOrderItem(currentItem.id, formData.items[0]);
        toast.success('Order item updated successfully!');
      } else {
        const newOrder = await createOrder();

        const promises = formData.items.map(item =>
          createOrderItem(newOrder.id, {
            ...item,
            price: item.price,
            quantity: item.quantity,
            name: formData.oncredit ? formData.customer_name : ""
          })
        );

        await Promise.all(promises);
        toast.success(`Order created successfully with ${formData.items.length} item(s)!`);
      }

      fetchData();
      setShowCreateEditModal(false);
      setCurrentItem(null);
    } catch (err: any) {
      console.error('Save error:', err);
      if (err.message.includes("Authentication required")) {
        window.location.href = ROUTES.login;
        return;
      }
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} order: ${err.message}`);
    }
  }, [isEditing, currentItem, formData, validateForm, fetchData]);

  const handleDeleteOrderItem = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = ROUTES.login;
      return;
    }

    if (!itemToDelete) return;

    try {
      await deleteOrderItem(itemToDelete);
      toast.success('Order item deleted successfully!');
      fetchData();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      if (err.message.includes("Authentication required")) {
        window.location.href = ROUTES.login;
        return;
      }
      toast.error(`Delete failed: ${err.message}`);
    }
  }, [itemToDelete, fetchData]);

  const handleDeleteOrder = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = ROUTES.login;
      return;
    }

    if (!orderToDelete) return;

    try {
      await deleteOrder(orderToDelete);
      toast.success('Order deleted successfully!');
      fetchData();
      setShowDeleteOrderModal(false);
      setOrderToDelete(null);
    } catch (err: any) {
      if (err.message.includes("Authentication required")) {
        window.location.href = ROUTES.login;
        return;
      }
      toast.error(`Delete failed: ${err.message}`);
    }
  }, [orderToDelete, fetchData]);

  const getTotalPrice = useCallback((item: ExtendedHotelOrderItem): string => {
    if (item.price !== undefined && item.price !== null) {
      return formatPrice(item.price);
    }
    return "0.00";
  }, []);

  const formatDateTime = useCallback((item: ExtendedHotelOrderItem): string => {
    if (item.order_created_at) {
      try {
        const date = new Date(item.order_created_at);
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch (e) { console.error('Date parsing error:', e); }
    }

    if (item.created_at) {
      try {
        const date = new Date(item.created_at);
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch (e) { console.error('Date parsing error:', e); }
    }

    return "N/A";
  }, []);

  const getFoodItemName = useCallback((item: ExtendedHotelOrderItem): string => {
    if (item.food_item_name) {
      return item.food_item_name;
    }
    const foodItem = getFoodItemObject(item);
    if (foodItem?.name) {
      return foodItem.name;
    }
    return "N/A";
  }, []);

  const getFoodItemCategory = useCallback((item: ExtendedHotelOrderItem): string => {
    const foodItem = getFoodItemObject(item);
    if (foodItem?.category) {
      if (typeof foodItem.category === 'object') {
        return foodItem.category.name || "Uncategorized";
      }
      return String(foodItem.category) || "Uncategorized";
    }
    return "Uncategorized";
  }, []);

  const handleExportCSV = useCallback(() => {
    const exportData = orderItems.map(item => ({
      'Order ID': item.order_id || 'N/A',
      'Date/Time': formatDateTime(item),
      'Created By': getCreatedByName(item),
      'Food Item': getFoodItemName(item),
      'Category': getFoodItemCategory(item),
      'Quantity': item.quantity || 0,
      'Total Price': `Ksh ${formatPrice(item.price)}`,
      'On Credit': item.oncredit ? 'Yes' : 'No',
      'Customer Name': item.name || 'N/A',
    }));

    exportToCSV(exportData, 'hotel_order_items');
    setExportDropdownOpen(false);
  }, [orderItems, formatDateTime, getFoodItemName, getFoodItemCategory]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(orderItems, 'hotel_order_items');
    setExportDropdownOpen(false);
  }, [orderItems]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  const handleFirstPage = useCallback(() => handlePageChange(1), [handlePageChange]);
  const handleLastPage = useCallback(() => handlePageChange(totalPages), [handlePageChange, totalPages]);
  const handlePrevPage = useCallback(() => handlePageChange(page - 1), [handlePageChange, page]);
  const handleNextPage = useCallback(() => handlePageChange(page + 1), [handlePageChange, page]);

  const paginationDisplay = useMemo(() => {
    const startIndex = Math.min((page - 1) * pageSize + 1, totalItems);
    const endIndex = Math.min(page * pageSize, totalItems);
    return { startIndex, endIndex };
  }, [page, totalItems, pageSize]);

  const pageNumbers = useMemo(() => {
    const numbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        numbers.push(i);
      }
    } else {
      let startPage = Math.max(1, page - 2);
      let endPage = Math.min(totalPages, page + 2);

      if (page <= 3) {
        endPage = maxVisiblePages;
      } else if (page >= totalPages - 2) {
        startPage = totalPages - maxVisiblePages + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        numbers.push(i);
      }
    }

    return numbers;
  }, [page, totalPages]);

  const orderTotal = useMemo(() => {
    return formatPrice(formData.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0));
  }, [formData.items]);

  // Render page numbers like in example
  const renderPageNumbers = useCallback(() => {
    if (totalPages <= 1) return null;

    const pages = [];
    const showEllipsis = totalPages > 5;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }

    return pages.map((p, i) => (
      p === '...' ?
        <span key={i} className="px-3 py-1 text-gray-500">...</span> :
        <button
          key={i}
          onClick={() => handlePageChange(p as number)}
          className={`px-3 py-1 text-sm font-medium rounded-md ${page === p ? 'bg-blue-600 text-white' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}
        >
          {p}
        </button>
    ));
  }, [page, totalPages, handlePageChange]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
         {/*<button
            onClick={() => window.location.href = ROUTES.dashboard} 
            className="inline-flex items-center px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:text-blue-600 hover:shadow-md transition-all"
          >
            <Home className="w-4 h-4 mr-2 text-blue-500" />
            <span className="text-sm font-medium">Dashboard Home</span>
          </button>*/} 

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap shrink-0">
                      From:
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={dateRange.start_date}
                      onChange={handleStartDateChange}
                      className="w-full min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap shrink-0">
                      To:
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={dateRange.end_date}
                      onChange={handleEndDateChange}
                      className="w-full min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleFilterClick}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition duration-200 flex items-center justify-center min-w-[80px]"
                  >
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Filter
                  </button>
                  <button
                    onClick={handleResetClick}
                    className="flex-1 sm:flex-none bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center min-w-[80px]"
                  >
                    <RotateCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Export Button - Updated to match styling */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all hover:bg-blue-600"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-2">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md w-full text-left transition-colors"
                    >
                      <FileText className="w-4 h-4 text-green-600" />
                      CSV
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md w-full text-left transition-colors"
                    >
                      <FileJson className="w-4 h-4 text-green-600" />
                      JSON
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Create Order Button - Updated to match styling */}
            <button
              onClick={handleCreateOrder}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all hover:bg-blue-600"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Order</span>
            </button>
          </div>
        </div>

        {isUserAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl m-2">
                  <Receipt className="text-blue-600 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{summary.total_orders}</h3>
                  <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    Ksh {summary.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-xl m-2">
                  <DollarSign className="text-green-600 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">
                    Ksh {summary.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-xl m-2">
                  <CreditCard className="text-yellow-600 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{summary.credit_orders_count}</h3>
                  <p className="text-sm text-gray-500 font-medium">Credit Orders</p>
                  <p className="text-xs text-yellow-600 font-medium mt-1">
                    Ksh {formatPrice(summary.credit_orders_value)} pending
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center p-12 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4 text-lg">Loading order items...</p>
            <p className="text-gray-400 text-sm mt-2">Fetching latest data...</p>
          </div>
        ) : error ? (
          <div className="text-center p-8 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200 shadow-lg">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-red-700 mb-2">Error Loading Data</h3>
            <p className="text-red-600 text-base mb-6">{error}</p>
            <button
              onClick={fetchData}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition flex items-center mx-auto shadow-md hover:shadow-lg text-base"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Retry Loading Data
            </button>
          </div>
        ) : orderItems.length > 0 ? (
          <div className="bg-white rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="pl-6 pr-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    {isUserAdmin && (
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    )}
                    <th className="pr-6 pl-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="pl-6 pr-4 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500">{formatDateTime(item)}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getCreatedByName(item)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 font-medium">{getFoodItemName(item)}</div>
                        {item.oncredit && item.name && (
                          <div className="text-xs text-purple-600 font-medium mt-1">
                            Credit: {item.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-1 rounded-lg inline-block">
                          {item.quantity || 0}
                        </div>
                      </td>
                      {isUserAdmin && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-blue-600">Ksh {getTotalPrice(item)}</div>
                        </td>
                      )}
                      <td className="pr-6 pl-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditOrderItem(item)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Order Item"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {isUserAdmin && (
                            <button
                              onClick={() => {
                                setItemToDelete(item.id);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Order Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Updated Pagination - Matching the example style */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{paginationDisplay.startIndex}</span> to{" "}
                  <span className="font-medium">{paginationDisplay.endIndex}</span> of{" "}
                  <span className="font-medium">{totalItems}</span> orders
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">{renderPageNumbers()}</div>
                  <button
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-2xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Receipt className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-600 text-base mb-6">
                {dateRange.start_date && dateRange.end_date
                  ? `No orders found between ${dateRange.start_date} and ${dateRange.end_date}.`
                  : "You haven't received any orders yet. Orders will appear here once customers start ordering."}
              </p>
              {dateRange.start_date && dateRange.end_date && (
                <button
                  onClick={handleResetClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition duration-200 inline-flex items-center text-base"
                >
                  <ListOrdered className="h-4 w-4 mr-2" />
                  View All Orders
                </button>
              )}
            </div>
          </div>
        )}

        {showCreateEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl my-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Edit Order Item' : 'Create New Order'}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {isEditing
                      ? 'Update order item details'
                      : 'Add multiple items to create a complete order'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateEditModal(false);
                    setCurrentItem(null);
                    setIsEditing(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 mb-8">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-900 text-base">Item {index + 1}</h4>
                      {formData.items.length > 1 && !isEditing && (
                        <button
                          type="button"
                          onClick={() => removeItemFromForm(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="flex items-center">
                            <Package className="h-4 w-4 mr-1 text-blue-600" />
                            Food Item *
                          </span>
                        </label>
                        <select
                          name="food_item"
                          value={item.food_item}
                          onChange={(e) => handleItemInputChange(index, e)}
                          className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${formErrors[`item_${index}_food_item`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                        >
                          <option value={0}>Select a food item...</option>
                          {foodItems.map((foodItem) => (
                            <option key={foodItem.id} value={foodItem.id}>
                              {foodItem.name}
                            </option>
                          ))}
                        </select>
                        {formErrors[`item_${index}_food_item`] && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {formErrors[`item_${index}_food_item`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          name="quantity"
                          value={item.quantity}
                          onChange={(e) => handleItemInputChange(index, e)}
                          className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${formErrors[`item_${index}_quantity`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          placeholder="Enter quantity"
                          min="1"
                        />
                        {formErrors[`item_${index}_quantity`] && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {formErrors[`item_${index}_quantity`]}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                            Total Price (Ksh) *
                          </span>
                          <span className="text-gray-500 text-xs">Enter total price for this item</span>
                        </label>
                        <input
                          type="number"
                          name="price"
                          value={item.price}
                          onChange={(e) => handleItemInputChange(index, e)}
                          className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${formErrors[`item_${index}_price`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          placeholder="Enter total price"
                          min="0"
                          step="0.01"
                        />
                        {formErrors[`item_${index}_price`] && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {formErrors[`item_${index}_price`]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {!isEditing && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={addItemToForm}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Item
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-start p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
                <input
                  type="checkbox"
                  id="oncredit"
                  name="oncredit"
                  checked={formData.oncredit}
                  onChange={handleOrderInputChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                />
                <label htmlFor="oncredit" className="ml-3 block text-sm font-medium text-gray-900">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-purple-600" />
                    Sell on Credit
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Check if customer will pay later</p>
                </label>
              </div>

              {formData.oncredit && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center">
                      <UserCircle className="h-4 w-4 mr-1 text-purple-600" />
                      Customer Name *
                    </span>
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name || ''}
                    onChange={handleOrderInputChange}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition ${formErrors.customer_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="Enter customer name"
                  />
                  {formErrors.customer_name && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {formErrors.customer_name}
                    </p>
                  )}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-base font-medium text-blue-900">
                    Order Total:
                  </span>
                  <span className="text-xl font-bold text-blue-700">
                    Ksh {orderTotal}
                  </span>
                </div>
              </div>

              <div className="flex justify-center space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateEditModal(false);
                    setCurrentItem(null);
                    setIsEditing(false);
                  }}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-xl transition-all duration-200 flex items-center text-base"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveOrder}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center shadow-md hover:shadow-lg text-base"
                >
                  {isEditing ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Order Item
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Order ({formData.items.length} items)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
                <p className="text-gray-600 text-base">Are you sure you want to delete this order item? This action cannot be undone.</p>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  className="px-6 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-xl transition-all duration-200 text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrderItem}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 text-base"
                >
                  <Trash2 className="h-4 w-4 mr-2 inline" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Order Deletion</h3>
                <p className="text-gray-600 text-base"> Are you sure you want to delete this entire order? </p>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteOrderModal(false);
                    setOrderToDelete(null);
                  }}
                  className="px-6 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-xl transition-all duration-200 text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrder}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 text-base"
                >
                  <Trash2 className="h-4 w-4 mr-2 inline" />
                  Delete Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
