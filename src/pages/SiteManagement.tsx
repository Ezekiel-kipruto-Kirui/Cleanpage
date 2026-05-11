import { useState, useMemo, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  User as UserIcon,
  Users,
  Clock,
  Activity,
  Search,
  Shield,
  CheckCircle,
  XCircle,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Trash2,
  Edit,
  UserPlus,
  Loader2,
  Store,
  Filter,
  Calendar,
  DollarSign,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/services/url";
import { getAccessToken } from "@/services/api";
import { User, Order as LaundryOrder, Customer } from "@/services/types";

// --- Types & Interfaces ---

interface ExtendedCustomer extends Customer {
  created_by?: any;
}

interface UserSalesSummary {
  user_id: number;
  username: string;
  email: string;
  total_revenue: number;
}

interface ApiHotelOrderItem {
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

interface ApiHotelOrder {
  id: number;
  order_items: ApiHotelOrderItem[];
  total_amount: number;
  created_by: {
    email: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

interface UserPerformanceData {
  laundryOrders: LaundryOrder[];
  hotelOrders: ApiHotelOrder[];
  customers: ExtendedCustomer[];
  totalRevenue: number;
  totalOrders: number;
  laundryRevenue: number;
  hotelRevenue: number;
}

// --- Utility Functions ---

const ensureArray = <T,>(data: unknown): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'object' && data !== null) {
    const anyData = data as any;
    if (Array.isArray(anyData.results)) return anyData.results as T[];
    if (Array.isArray(anyData.data)) return anyData.data as T[];
  }
  return [];
};

const safeParseFloat = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
};

const getAuthHeaders = () => {
  const token = getAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('current_user') || sessionStorage.getItem('current_user');
    if (userStr) {
      try { return JSON.parse(userStr); } catch (e) { console.error(e); }
    }
  }
  return null;
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Never';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return 'Invalid date'; }
};

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'Never';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return 'Invalid date'; }
};

const formatCurrency = (amount: number) => {
  // FIX: Ensure only 'amount' is passed to format(), and .replace() is chained outside
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount).replace('KES', 'KSh');
};

// --- API Functions ---

const fetchAllPages = async <T,>(endpoint: string): Promise<T[]> => {
  let allResults: T[] = [];
  let nextUrl: string | null = `${API_BASE_URL}${endpoint}`;
  try {
    while (nextUrl) {
      const response = await fetch(nextUrl, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        allResults = [...allResults, ...data];
        nextUrl = null;
      } else if (data?.results && Array.isArray(data.results)) {
        allResults = [...allResults, ...data.results];
        nextUrl = data.next;
      } else if (data?.data && Array.isArray(data.data)) {
        allResults = [...allResults, ...data.data];
        nextUrl = null;
      } else {
        nextUrl = null;
      }
      if (nextUrl && !nextUrl.startsWith('http')) nextUrl = `${API_BASE_URL}${nextUrl}`;
    }
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
  }
  return allResults;
};

const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/Laundry/users/`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch users');
    return ensureArray<User>(await response.json());
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

const fetchLaundrySalesSummary = async (): Promise<{ data: UserSalesSummary[] }> => {
  const response = await fetch(`${API_BASE_URL}/Laundry/orders/user_sales_summary/`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch laundry summary');
  const json = await response.json();
  return { data: ensureArray<UserSalesSummary>(json) };
};

const fetchHotelSalesSummary = async (): Promise<{ data: UserSalesSummary[] }> => {
  const response = await fetch(`${API_BASE_URL}/Hotel/orders/user_sales_summary/`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch hotel summary');
  const json = await response.json();
  return { data: ensureArray<UserSalesSummary>(json) };
};

const fetchUserLaundryOrders = async ({ userId, startDate, endDate }: { userId: number; startDate?: string; endDate?: string }): Promise<LaundryOrder[]> => {
  let url = `${API_BASE_URL}/Laundry/orders/?created_by=${userId}`;
  if (startDate) url += `&created_at__gte=${startDate}`;
  if (endDate) url += `&created_at__lte=${endDate}T23:59:59`;
  return fetchAllPages<LaundryOrder>(url.replace(API_BASE_URL, ''));
};

const fetchUserHotelOrders = async ({ userId, startDate, endDate }: { userId: number; startDate?: string; endDate?: string }): Promise<ApiHotelOrder[]> => {
  let url = `${API_BASE_URL}/Hotel/orders/?created_by=${userId}`;
  if (startDate) url += `&created_at__gte=${startDate}`;
  if (endDate) url += `&created_at__lte=${endDate}T23:59:59`;
  return fetchAllPages<ApiHotelOrder>(url.replace(API_BASE_URL, ''));
};

const fetchAllCustomers = (): Promise<ExtendedCustomer[]> => fetchAllPages<ExtendedCustomer>('/Laundry/customers/');

const createUser = async (userData: any): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/Laundry/users/`, {
    method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || errorData.email?.[0] || `Failed: ${response.status}`);
  }
  return response.json();
};

const updateUser = async (userId: number, userData: any): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/Laundry/users/${userId}/`, {
    method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed: ${response.status}`);
  }
  return response.json();
};

const deleteUser = async (userId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/Laundry/users/${userId}/`, {
    method: 'DELETE', headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete user');
};

// --- Sub-Components ---

interface OrdersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  userId: number | null;
  type: 'laundry' | 'hotel';
  dateFilter: { startDate?: string; endDate?: string };
}

// FIX: Added generics <any, Error, any> to useQuery to handle dynamic return types
const OrdersDialog = memo(({ isOpen, onOpenChange, title, userId, type, dateFilter }: OrdersDialogProps) => {
  
  const { data: orders = [], isLoading } = useQuery<any, Error, any>({
    queryKey: ['user-orders', type, userId, dateFilter],
    queryFn: () => type === 'laundry' 
      ? fetchUserLaundryOrders({ userId: userId!, ...dateFilter })
      : fetchUserHotelOrders({ userId: userId!, ...dateFilter }),
    enabled: isOpen && !!userId,
  });

  const getOrderStatusColor = (status: string) => ({
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Completed': 'bg-green-100 text-green-800 border-green-200',
    'Delivered_picked': 'bg-blue-100 text-blue-800 border-blue-200',
  }[status] || 'bg-gray-100 text-gray-800 border-gray-200');

  const getPaymentStatusColor = (status: string) => ({
    'pending': 'bg-red-100 text-red-800 border-red-200',
    'completed': 'bg-green-100 text-green-800 border-green-200',
    'partial': 'bg-orange-100 text-orange-800 border-orange-200',
  }[status] || 'bg-gray-100 text-gray-800 border-gray-200');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'laundry' ? <ShoppingBag className="h-5 w-5 text-blue-600" /> : <Store className="h-5 w-5 text-orange-600" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {isLoading ? 'Loading...' : `${orders.length} ${type} orders found`}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
        ) : orders.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">{type === 'laundry' ? 'Order Code' : 'Order ID'}</TableHead>
                  <TableHead className="font-medium">{type === 'laundry' ? 'Customer' : 'Items'}</TableHead>
                  <TableHead className="font-medium text-right">Total Amount</TableHead>
                  {type === 'laundry' && <TableHead className="font-medium">Status</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-900">{formatDate(order.created_at)}</TableCell>
                    {type === 'laundry' ? (
                      <>
                        <TableCell><div className="font-medium text-blue-600">{order.uniquecode}</div></TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{order.customer?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{order.customer?.phone || 'No phone'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right"><span className="font-bold text-gray-900">{formatCurrency(safeParseFloat(order.total_price))}</span></TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={cn("font-medium", getOrderStatusColor(order.order_status))}>{order.order_status}</Badge>
                            <Badge variant="outline" className={cn("text-xs", getPaymentStatusColor(order.payment_status))}>{order.payment_status}</Badge>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell><div className="font-medium text-orange-600">#{order.id}</div></TableCell>
                        <TableCell>
                          <div className="space-y-1 max-w-md">
                            {order.order_items?.map((item: any) => (
                              <div key={item.id} className="text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-900">{item.food_item_name}</span>
                                  <span className="text-gray-600">x{item.quantity}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right"><span className="font-bold text-gray-900">{formatCurrency(order.total_amount || 0)}</span></TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {type === 'laundry' ? <ShoppingBag className="h-8 w-8 text-gray-400" /> : <Store className="h-8 w-8 text-gray-400" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {type === 'laundry' ? 'Laundry' : 'Hotel'} Orders</h3>
            <p className="text-gray-500">No orders found.</p>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
OrdersDialog.displayName = "OrdersDialog";

// Main Component
export default function SiteManagement() {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const isSuperUser = currentUser?.is_superuser || false;

  // State
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [dateFilter, setDateFilter] = useState<{ startDate?: string; endDate?: string }>({});
  
  const [laundryOrdersDialog, setLaundryOrdersDialog] = useState<{ isOpen: boolean; userId: number | null; userName: string }>({ isOpen: false, userId: null, userName: '' });
  const [hotelOrdersDialog, setHotelOrdersDialog] = useState<{ isOpen: boolean; userId: number | null; userName: string }>({ isOpen: false, userId: null, userName: '' });

  const [newUser, setNewUser] = useState({
    email: "", password: "", confirm_password: "", user_type: "staff",
    is_staff: true, is_active: true, first_name: "", last_name: "",
  });

  const [editUser, setEditUser] = useState({
    email: "", user_type: "staff", is_staff: false, is_active: true,
    first_name: "", last_name: "", password: "",
  });

  const [formErrors, setFormErrors] = useState<{ create?: Record<string, string>; edit?: Record<string, string> }>({});

  // Queries
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
    retry: 1,
  });

  const { data: laundrySummaryData = { data: [] } } = useQuery<{ data: UserSalesSummary[] }>({
    queryKey: ['laundry-sales-summary'],
    queryFn: fetchLaundrySalesSummary,
  });

  const { data: hotelSummaryData = { data: [] } } = useQuery<{ data: UserSalesSummary[] }>({
    queryKey: ['hotel-sales-summary'],
    queryFn: fetchHotelSalesSummary,
  });

  const { data: allCustomers = [] } = useQuery<ExtendedCustomer[]>({
    queryKey: ['customers'],
    queryFn: fetchAllCustomers,
    retry: 1,
  });

  // --- OPTIMIZED Data Processing using Backend Summaries ---
  const userPerformanceData = useMemo(() => {
    const data: Record<number, UserPerformanceData> = {};

    // Initialize all users
    users.forEach(user => {
      data[user.id] = {
        laundryOrders: [], hotelOrders: [], customers: [],
        totalRevenue: 0, totalOrders: 0, laundryRevenue: 0, hotelRevenue: 0
      };
    });

    const findUserId = (summaryItem: UserSalesSummary): number | null => {
      if (data[summaryItem.user_id]) return summaryItem.user_id;
      const matchedUser = users.find(u => u.email === summaryItem.email);
      return matchedUser ? matchedUser.id : null;
    };

    // Process Laundry Summary
    const laundrySummary = ensureArray<UserSalesSummary>(laundrySummaryData);
    const hotelSummary = ensureArray<UserSalesSummary>(hotelSummaryData);

    laundrySummary.forEach(item => {
      const userId = findUserId(item);
      if (userId && data[userId]) {
        data[userId].laundryRevenue = Number(item.total_revenue) || 0;
        data[userId].totalOrders += Number((item as any).total_orders) || 0;
      }
    });

    // Process Hotel Summary
    hotelSummary.forEach(item => {
      const userId = findUserId(item);
      if (userId && data[userId]) {
        data[userId].hotelRevenue = Number(item.total_revenue) || 0;
        data[userId].totalOrders += Number((item as any).total_orders) || 0;
      }
    });

    // Process Customers
    allCustomers.forEach(customer => {
      let userId: number | null = null;
      if (typeof customer.created_by === 'number') userId = customer.created_by;
      else if (typeof customer.created_by === 'string') {
         const match = customer.created_by.match(/(\d+)$/);
         if (match) userId = parseInt(match[0]);
      }
      if (userId && data[userId]) {
        data[userId].customers.push(customer);
      }
    });

    Object.values(data).forEach(userData => {
      userData.totalRevenue = userData.laundryRevenue + userData.hotelRevenue;
    });

    return data;
  }, [users, laundrySummaryData, hotelSummaryData, allCustomers]);

  // Filtering logic
  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      user.email.toLowerCase().includes(searchLower) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchLower));
    const matchesUserType = userTypeFilter === "all" || user.user_type === userTypeFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" && user.is_active) || (statusFilter === "inactive" && !user.is_active);
    return matchesSearch && matchesUserType && matchesStatus;
  });

  // Handlers
  const toggleUserExpansion = (userId: number) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) newSet.delete(userId); else newSet.add(userId);
      return newSet;
    });
  };

  const getUserInitials = (user: User) => {
    const first = user.first_name || '';
    const last = user.last_name || '';
    return (first || last) ? `${first[0]}${last[0]}`.toUpperCase() : user.email[0].toUpperCase();
  };

  const clearDateFilters = () => setDateFilter({});

  const getUserTypeColor = (userType: string) => ({
    'admin': 'bg-purple-100 text-purple-800 border-purple-200',
    'staff': 'bg-blue-100 text-blue-800 border-blue-200',
    'customer': 'bg-green-100 text-green-800 border-green-200',
    'manager': 'bg-orange-100 text-orange-800 border-orange-200',
  }[userType] || 'bg-gray-100 text-gray-800 border-gray-200');

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully!');
      setIsCreateUserOpen(false);
      setNewUser({ email: "", password: "", confirm_password: "", user_type: "staff", is_staff: true, is_active: true, first_name: "", last_name: "" });
    },
    onError: (error: Error) => toast.error(`Failed to create user: ${error.message}`),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: any }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setIsEditUserOpen(false);
      setSelectedUserId(null);
    },
    onError: (error: Error) => toast.error(`Failed to update user: ${error.message}`),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
      setIsDeleteConfirmOpen(false);
      setSelectedUserId(null);
    },
    onError: (error: Error) => toast.error(`Failed to delete user: ${error.message}`),
  });

  // Helper Handlers
  const handleCreateUser = () => {
    if (!newUser.email || !newUser.password) return toast.error("Email and Password required");
    createUserMutation.mutate({
      ...newUser,
      first_name: newUser.first_name.trim() || undefined,
      last_name: newUser.last_name.trim() || undefined,
    });
  };

  const handleEditUser = () => {
    if (!selectedUserId) return;
    updateUserMutation.mutate({
      userId: selectedUserId,
      data: {
        ...editUser,
        first_name: editUser.first_name.trim() || undefined,
        last_name: editUser.last_name.trim() || undefined,
        password: editUser.password || undefined,
      }
    });
  };

  const handleDeleteUser = () => {
    if (!selectedUserId) return;
    if (currentUser?.id === selectedUserId) return toast.error("You cannot delete your own account");
    deleteUserMutation.mutate(selectedUserId);
  };

  const openEditDialog = (user: User) => {
    setSelectedUserId(user.id);
    setEditUser({
      email: user.email, user_type: user.user_type, is_staff: user.is_staff,
      is_active: user.is_active, first_name: user.first_name || "", last_name: user.last_name || "", password: "",
    });
    setIsEditUserOpen(true);
  };

  // Render Logic
  if (usersError) {
    return <div className="flex items-center justify-center h-screen"><div className="text-center text-red-600"><h2>Error Loading Users</h2><p>{(usersError as Error).message}</p></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Site Management</h1>
          <p className="text-gray-600">Manage users and track their performance</p>
        </div>
        {isSuperUser && (
          <Button onClick={() => setIsCreateUserOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <UserPlus className="mr-2 h-4 w-4" /> Create New User
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6 border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg font-semibold">Date Filters</CardTitle>
            </div>
            {(dateFilter.startDate || dateFilter.endDate) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilters}>Clear Filters</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input id="start-date" type="date" value={dateFilter.startDate || ''} onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input id="end-date" type="date" value={dateFilter.endDate || ''} onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={clearDateFilters}>Reset Dates</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-gray-900">{usersLoading ? "..." : users.length}</div></CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            <Activity className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-gray-900">{usersLoading ? "..." : users.filter(u => u.is_active).length}</div></CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>{filteredUsers.length} users found</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="User Type" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /><span className="ml-2">Loading...</span></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No users found</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const isExpanded = expandedUsers.has(user.id);
                const perf = userPerformanceData[user.id] || { totalRevenue: 0, totalOrders: 0, laundryOrders: [], hotelOrders: [], laundryRevenue: 0, hotelRevenue: 0 };
                
                return (
                  <div key={user.id} className="hover:bg-gray-50 transition-colors">
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                          <AvatarFallback className={user.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : user.email}
                            </h3>
                            <Badge variant="outline" className={getUserTypeColor(user.user_type)}>{user.user_type}</Badge>
                            {user.is_staff && <Badge variant="outline" className="bg-blue-50 text-blue-700"><Shield className="h-3 w-3 mr-1" /> Staff</Badge>}
                          </div>
                          <div className="flex items-center gap-4 text-sm flex-wrap text-gray-600">
                            <span className="truncate">{user.email}</span>
                            <span className="flex items-center gap-1 text-green-700"><DollarSign className="h-4 w-4" /> {formatCurrency(perf.totalRevenue)}</span>
                            <span className="flex items-center gap-1 text-gray-500"><Clock className="h-4 w-4" /> {formatDateTime(user.last_login)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-gray-500">Joined {formatDate(user.date_joined)}</div>
                          <div className={user.is_active ? "text-green-600" : "text-red-600"}>
                            {user.is_active ? <CheckCircle className="inline h-4 w-4" /> : <XCircle className="inline h-4 w-4" />}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => toggleUserExpansion(user.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        {isSuperUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-9 w-9 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(user)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateUserMutation.mutate({ userId: user.id, data: { is_active: !user.is_active } })}>
                                {user.is_active ? <><XCircle className="mr-2 h-4 w-4" /> Deactivate</> : <><CheckCircle className="mr-2 h-4 w-4" /> Activate</>}
                              </DropdownMenuItem>
                              {!user.is_superuser && <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedUserId(user.id); setIsDeleteConfirmOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50/50 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <Card className="border-blue-200">
                            <CardHeader className="pb-2 flex flex-row justify-between items-center">
                              <CardTitle className="text-sm font-medium text-blue-700">Laundry Performance</CardTitle>
                            </CardHeader>
                            <CardContent><div className="text-sm font-bold text-blue-700">{formatCurrency(perf.laundryRevenue)}</div></CardContent>
                          </Card>
                          <Card className="border-orange-200">
                            <CardHeader className="pb-2 flex flex-row justify-between items-center">
                              <CardTitle className="text-sm font-medium text-orange-700">Hotel Performance</CardTitle>
                            </CardHeader>
                            <CardContent><div className="text-sm font-bold text-orange-700">{formatCurrency(perf.hotelRevenue)}</div></CardContent>
                          </Card>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="outline" size="sm" onClick={() => setLaundryOrdersDialog({ isOpen: true, userId: user.id, userName: user.first_name || user.email })}>
                            <ShoppingBag className="h-4 w-4 mr-2" /> View Laundry Orders
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setHotelOrdersDialog({ isOpen: true, userId: user.id, userName: user.first_name || user.email })}>
                            <Store className="h-4 w-4 mr-2" /> View Hotel Orders
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OrdersDialog
        isOpen={laundryOrdersDialog.isOpen}
        onOpenChange={(open) => setLaundryOrdersDialog(prev => ({ ...prev, isOpen: open }))}
        title={`Laundry Orders - ${laundryOrdersDialog.userName}`}
        userId={laundryOrdersDialog.userId}
        type="laundry"
        dateFilter={dateFilter}
      />
      <OrdersDialog
        isOpen={hotelOrdersDialog.isOpen}
        onOpenChange={(open) => setHotelOrdersDialog(prev => ({ ...prev, isOpen: open }))}
        title={`Hotel Orders - ${hotelOrdersDialog.userName}`}
        userId={hotelOrdersDialog.userId}
        type="hotel"
        dateFilter={dateFilter}
      />

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Create New User</DialogTitle><DialogDescription>Add a new user account.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input value={newUser.first_name} onChange={e => setNewUser({...newUser, first_name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={newUser.last_name} onChange={e => setNewUser({...newUser, last_name: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Password *</Label><Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div>
              <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={newUser.confirm_password} onChange={e => setNewUser({...newUser, confirm_password: e.target.value})} /></div>
            </div>
            <div className="space-y-2">
              <Label>User Type</Label>
              <Select value={newUser.user_type} onValueChange={v => setNewUser({...newUser, user_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="staff">Staff</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2"><Switch id="c_staff" checked={newUser.is_staff} onCheckedChange={c => setNewUser({...newUser, is_staff: c})} /><Label htmlFor="c_staff">Staff Member</Label></div>
              <div className="flex items-center space-x-2"><Switch id="c_active" checked={newUser.is_active} onCheckedChange={c => setNewUser({...newUser, is_active: c})} /><Label htmlFor="c_active">Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Edit User</DialogTitle><DialogDescription>Update user details.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input value={editUser.first_name} onChange={e => setEditUser({...editUser, first_name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={editUser.last_name} onChange={e => setEditUser({...editUser, last_name: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} /></div>
            <div className="space-y-2"><Label>New Password (Optional)</Label><Input type="password" placeholder="Leave blank to keep current" value={editUser.password} onChange={e => setEditUser({...editUser, password: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>User Type</Label>
              <Select value={editUser.user_type} onValueChange={v => setEditUser({...editUser, user_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="staff">Staff</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2"><Switch id="e_staff" checked={editUser.is_staff} onCheckedChange={c => setEditUser({...editUser, is_staff: c})} /><Label htmlFor="e_staff">Staff Member</Label></div>
              <div className="flex items-center space-x-2"><Switch id="e_active" checked={editUser.is_active} onCheckedChange={c => setEditUser({...editUser, is_active: c})} /><Label htmlFor="e_active">Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={updateUserMutation.isPending}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Delete User</DialogTitle><DialogDescription>Are you sure? This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleteUserMutation.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
