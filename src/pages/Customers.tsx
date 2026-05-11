import { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, Order } from '../services/types';
import {
    Users,
    Edit,
    Trash2,
    RefreshCw,
    PlusCircle,
    ShoppingCart,
    Eye,
    Search,
    User,
    ShoppingBag,
    ChartLine,
    ChevronLeft,
    ChevronRight,
    Store,
    Calendar,
    DollarSign,
    UserCircle,
    FileText,
    MessageSquare,
    Send,
    AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '@/services/url';

// --- API Endpoints ---
const API_CUSTOMERS_URL = `${API_BASE_URL}/Laundry/customers/`;
const API_ORDERS_URL = `${API_BASE_URL}/Laundry/orders/`;
// Ensure URL includes /Laundry/ to avoid 405 errors
const API_SMS_URL = `${API_BASE_URL}/Laundry/send-sms/`;

// --- Types for Pagination ---
interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
    current_page?: number;
    total_pages?: number;
    page_size?: number;
}

interface PaginatedCustomersResponse extends PaginatedResponse<Customer> {
    results: Customer[];
}

interface PaginatedOrdersResponse extends PaginatedResponse<Order> {
    results: Order[];
}

// Type assertion helper for customer objects
const assertCustomer = (customer: any): Customer => {
    return {
        id: customer?.id || 0,
        name: customer?.name || 'Unknown',
        phone: customer?.phone || '',
        order_count: customer?.order_count || 0,
        total_spent: customer?.total_spent || '0',
        last_order_date: customer?.last_order_date || null
    };
};

// SMS Send Modal Component
const SMSModal = ({
    isOpen,
    onClose,
    onSend,
    customerCount,
    isSending
}: {
    isOpen: boolean;
    onClose: () => void;
    onSend: (message: string) => void;
    customerCount: number;
    isSending: boolean;
}) => {
    const [message, setMessage] = useState('');
    const [charCount, setCharCount] = useState(0);

    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setMessage(value);
        setCharCount(value.length);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && customerCount > 0) {
            onSend(message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                    <div className="flex items-center">
                        <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Send SMS to All Customers</h2>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message to send (All customers in database)
                        </label>
                        <textarea
                            value={message}
                            onChange={handleMessageChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-40"
                            placeholder="Type your message here..."
                            required
                            maxLength={160}
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-gray-500">
                                Characters: {charCount}/160
                            </span>
                            <span className="text-xs text-gray-500">
                                SMS parts: {Math.ceil(charCount / 160)}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                            disabled={isSending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSending || !message.trim()}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isSending ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send SMS to All Customers
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Card Component for Dashboard Metrics
const Card = ({ icon: Icon, title, value, colorClass }: { icon: React.ElementType, title: string, value: string | number, colorClass: string }) => {
    const colors: { [key: string]: string } = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500'
    };
    const bgColor = colors[colorClass] || 'bg-blue-500';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
                <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center mr-4`}>
                    <Icon className="text-white text-xl" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm text-gray-600">{title}</p>
                </div>
            </div>
        </div>
    );
};

// Customer Form Modal
const CustomerFormModal = ({ customer, onSave, onClose }: { customer: Customer | null, onSave: (c: Customer) => void, onClose: () => void }) => {
    const [name, setName] = useState(customer?.name || '');
    const [phone, setPhone] = useState(customer?.phone || '');
    const isNew = !customer || customer.id === 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(customer || { id: 0, phone: '', name: '', order_count: 0, total_spent: '0', last_order_date: null }),
            name,
            phone,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isNew ? 'Add New Customer' : 'Edit Customer'}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm"
                        >
                            {isNew ? 'Add Customer' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Order Status Badge Component
const OrderStatusBadge = ({ status }: { status: string }) => {
    const getStatusConfig = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' };
            case 'pending':
                return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' };
            case 'processing':
                return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' };
            case 'delivered_picked':
                return { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Delivered' };
            case 'cancelled':
                return { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
        }
    };

    const config = getStatusConfig(status);
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    );
};

// Payment Status Badge Component
const PaymentStatusBadge = ({ status }: { status: string }) => {
    const getStatusConfig = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' };
            case 'partial':
                return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Partial' };
            case 'pending':
                return { bg: 'bg-red-100', text: 'text-red-800', label: 'Pending' };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
        }
    };

    const config = getStatusConfig(status);
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    );
};

// Customer Detail View Modal with Orders Table
const CustomerDetailModal = ({ customer, orders, onClose, onEdit, onDelete }: {
    customer: Customer,
    orders: Order[],
    onClose: () => void,
    onEdit: () => void,
    onDelete: () => void
}) => {
    // Optimization: Filter for this specific customer only (fast enough as usually one customer has limited orders)
    const customerOrders = orders.filter(order => {
        const orderCustomer = assertCustomer(order.customer);
        return orderCustomer.id === customer.id;
    });

    const totalSpent = customerOrders.reduce((sum, order) =>
        sum + parseFloat(order.total_price || '0'), 0
    ).toFixed(2);

    const totalBalance = customerOrders.reduce((sum, order) =>
        sum + parseFloat(order.balance || '0'), 0
    ).toFixed(2);

    const pendingOrders = customerOrders.filter(order =>
        order.order_status === 'pending'
    ).length;

    const completedOrders = customerOrders.filter(order =>
        order.order_status === 'Completed' || order.order_status === 'Delivered_picked'
    ).length;

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: string) => {
        const num = parseFloat(amount);
        return `KSh ${isNaN(num) ? '0.00' : num.toLocaleString('en-KE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">Customer Details</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="flex items-center mb-6">
                        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                            <User className="text-white text-2xl" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                            <p className="text-gray-600">ID: {customer.id} • Phone: {customer.phone}</p>
                        </div>
                        <div className="space-x-2">
                            <button onClick={onEdit} className="inline-flex items-center p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors duration-200" title="Edit Customer"><Edit className="w-4 h-4 mr-2" /> Edit</button>
                            <button onClick={onDelete} className="inline-flex items-center p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200" title="Delete Customer"><Trash2 className="w-4 h-4 mr-2" /> Delete</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-800 mb-2">Total Orders</h3>
                            <p className="text-2xl font-bold text-blue-900">{customerOrders.length}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-green-800 mb-2">Total Billed</h3>
                            <p className="text-2xl font-bold text-green-900">{formatCurrency(totalSpent)}</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-yellow-800 mb-2">Pending Balance</h3>
                            <p className="text-2xl font-bold text-yellow-900">{formatCurrency(totalBalance)}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-purple-800 mb-2">Active Orders</h3>
                            <p className="text-2xl font-bold text-purple-900">{pendingOrders}</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Customer Orders ({customerOrders.length})</h3>
                        </div>

                        {customerOrders.length > 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    <div className="flex items-center">
                                                        <FileText className="w-4 h-4 mr-2" />
                                                        Order Code
                                                    </div>
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Billed</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {customerOrders.map((order) => {
                                                const orderCustomer = assertCustomer(order.customer);
                                                return (
                                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-blue-600">{order.uniquecode}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">{order.shop || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <OrderStatusBadge status={order.order_status} />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <PaymentStatusBadge status={order.payment_status} />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {formatCurrency(order.total_price)}
                                                            </div>
                                                            {parseFloat(order.balance) > 0 && (
                                                                <div className="text-xs text-red-500">
                                                                    Balance: {formatCurrency(order.balance)}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {formatDate(order.created_at)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-gray-50 rounded-xl">
                                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No orders found for this customer</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                        <button onClick={onClose} className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function for API calls
const apiFetch = async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem('access_token');

    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Unauthorized');
        }
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    if (response.status === 204) {
        return null as T;
    }

    return response.json();
};

// Helper function to fetch ALL orders with pagination
const fetchAllOrdersWithPagination = async (): Promise<Order[]> => {
    let allOrders: Order[] = [];
    let nextUrl: string | null = `${API_ORDERS_URL}?page_size=100`;
    let pageCount = 0;
    const MAX_PAGES = 20;

    console.log('Starting to fetch all orders...');

    while (nextUrl && pageCount < MAX_PAGES) {
        try {
            console.log(`Fetching orders page ${pageCount + 1}: ${nextUrl}`);
            const response = await apiFetch<PaginatedOrdersResponse>(nextUrl);

            if (response.results && Array.isArray(response.results)) {
                const processedOrders = response.results.map(order => {
                    const customer = assertCustomer(order.customer);
                    return { ...order, customer: customer };
                });

                allOrders = [...allOrders, ...processedOrders];
                nextUrl = response.next;
                pageCount++;
            } else {
                console.error('Invalid response format - missing results array:', response);
                break;
            }
        } catch (error) {
            console.error('Error fetching orders page:', error);
            break;
        }
    }

    console.log(`Finished fetching orders. Total: ${allOrders.length} orders`);
    return allOrders;
};

const getAuthToken = (): string | null => localStorage.getItem("accessToken");

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
    const [isSendingSMS, setIsSendingSMS] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
    const [ordersLoading, setOrdersLoading] = useState(false);

    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: 10,
        next: null as string | null,
        previous: null as string | null
    });

    // OPTIMIZATION 1: Calculate Customer Stats Map using useMemo
    // This ensures we only iterate through 'orders' (e.g. 2000 items) once when 'orders' change,
    // instead of filtering it for every customer (e.g. 100 customers) on every render.
    const customerStatsMap = useMemo(() => {
        const map = new Map<number, { orderCount: number, totalBilled: number, lastOrderDate: string | null }>();

        orders.forEach(order => {
            const customer = assertCustomer(order.customer);
            const cid = customer.id;

            if (!map.has(cid)) {
                map.set(cid, { orderCount: 0, totalBilled: 0, lastOrderDate: null });
            }

            const stats = map.get(cid)!;
            stats.orderCount++;

            const price = parseFloat(order.total_price || '0');
            if (!isNaN(price)) {
                stats.totalBilled += price;
            }

            // Track last order date
            if (order.created_at) {
                if (!stats.lastOrderDate || new Date(order.created_at) > new Date(stats.lastOrderDate)) {
                    stats.lastOrderDate = order.created_at;
                }
            }
        });

        return map;
    }, [orders]);

    // Helper function to fetch ALL customers (bypassing pagination)
    const fetchAllCustomers = useCallback(async (): Promise<Customer[]> => {
        try {
            let allCustomers: Customer[] = [];
            let nextUrl: string | null = `${API_CUSTOMERS_URL}?page_size=100`;

            while (nextUrl) {
                const response = await apiFetch<PaginatedCustomersResponse>(nextUrl);

                if (response.results && Array.isArray(response.results)) {
                    allCustomers = [...allCustomers, ...response.results];
                    nextUrl = response.next;
                } else {
                    console.error('Invalid response format:', response);
                    break;
                }

                if (allCustomers.length > 1000) break;
            }

            return allCustomers;
        } catch (err: any) {
            console.error("Error fetching all customers:", err);
            throw err;
        }
    }, []);

    const fetchAllOrders = useCallback(async () => {
        setOrdersLoading(true);
        try {
            const allOrders = await fetchAllOrdersWithPagination();
            setOrders(allOrders);
            console.log(`Successfully loaded ${allOrders.length} orders`);
        } catch (err: any) {
            console.error("Error fetching all orders:", err);
            setError(`Failed to load orders: ${err.message}`);
        } finally {
            setOrdersLoading(false);
        }
    }, []);

    const fetchCustomers = useCallback(async (page = 1, search = '') => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pagination.pageSize.toString()
            });

            if (search.trim()) {
                params.append('search', search);
            }

            const url = `${API_CUSTOMERS_URL}?${params}`;
            console.log(`Fetching customers from: ${url}`);

            const response = await apiFetch<PaginatedCustomersResponse>(url);

            if (!response.results || !Array.isArray(response.results)) {
                throw new Error('Invalid response format');
            }

            // OPTIMIZATION 2: Use the pre-calculated Map instead of filtering for each customer
            const transformedData = response.results.map((customer: Customer) => {
                const stats = customerStatsMap.get(customer.id) || { orderCount: 0, totalBilled: 0, lastOrderDate: null };

                return {
                    ...customer,
                    order_count: stats.orderCount,
                    total_spent: stats.totalBilled.toFixed(2),
                    last_order_date: stats.lastOrderDate
                };
            });

            setCustomers(transformedData);

            const totalItems = response.count || 0;
            const totalPages = response.total_pages || Math.ceil(totalItems / pagination.pageSize) || 1;
            const currentPage = response.current_page || page;
            const pageSize = response.page_size || pagination.pageSize;

            setPagination({
                currentPage,
                totalPages,
                totalItems,
                pageSize,
                next: response.next,
                previous: response.previous
            });
        } catch (err: any) {
            console.error("Error fetching customers:", err);
            if (err.message === "Unauthorized") {
                setError("Session expired. Please login again.");
            } else {
                setError("Could not load customers data. Please check API status.");
            }
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [orders, pagination.pageSize, customerStatsMap]);

    // SMS Sending Function
    const sendBulkSMS = async (message: string) => {
        setIsSendingSMS(true);
        setError(null);

        try {
            // OPTIMIZATION 3: Use state directly instead of fetching all customers again
            if (allCustomers.length === 0) {
                alert("No customers found in database.");
                return;
            }

            const phoneNumbers = [...new Set(
                allCustomers
                    .map(customer => customer.phone)
                    .filter(phone => phone && phone.trim() !== '')
            )];

            if (phoneNumbers.length === 0) {
                alert("No valid phone numbers found among customers.");
                return;
            }

            // --- UPDATE: Limit to 100 customers ---
            const SMS_LIMIT = 100;
            let finalPhoneNumbers = phoneNumbers;
            
            // If there are more than 100 numbers, slice the array
            if (phoneNumbers.length > SMS_LIMIT) {
                finalPhoneNumbers = phoneNumbers.slice(0, SMS_LIMIT);
            }

            // Update confirmation message to reflect the limit
            const isTruncated = phoneNumbers.length > SMS_LIMIT;
            const countText = isTruncated
                ? `the first ${SMS_LIMIT} customers (Total available: ${phoneNumbers.length}).`
                : `${finalPhoneNumbers.length} customer(s).`;

            if (!confirm(`Are you sure you want to send SMS to ${countText}`)) {
                setIsSendingSMS(false);
                return;
            }

            const token = getAuthToken();
            if (!token) throw new Error('Unauthorized');

            const res = await fetch(API_SMS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    to_number: finalPhoneNumbers, // Send the limited array
                    message: message
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('SMS API Error:', errorText);
                throw new Error(`Failed to send SMS: ${res.status}`);
            }

            const result = await res.json();
            console.log('SMS Result:', result);
            alert(`SMS sent successfully to ${finalPhoneNumbers.length} customer(s)!`);

            setIsSMSModalOpen(false);

        } catch (err: any) {
            console.error("Error sending SMS:", err);
            setError(`Failed to send SMS: ${err instanceof Error ? err.message : 'Unknown error'}`);
            alert("Failed to send SMS. Please try again.");
        } finally {
            setIsSendingSMS(false);
        }
    };

    // Initial data loading
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                console.log('Loading initial data...');

                // OPTIMIZATION 4: Parallel Fetching (Promise.all)
                // Fetch Customers and Orders at the same time instead of waiting for one then the other
                const [allCust, ordersData] = await Promise.all([
                    fetchAllCustomers(),
                    fetchAllOrdersWithPagination()
                ]);

                setAllCustomers(allCust);
                console.log(`Fetched ${allCust.length} customers`);

                setOrders(ordersData);
                console.log(`Fetched ${ordersData.length} orders`);

                await fetchCustomers(1, '');
                console.log('Initial data loading complete');
            } catch (err) {
                console.error("Error loading initial data:", err);
                setError("Failed to load initial data. Please refresh page.");
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, []);

    useEffect(() => {
        if (!loading && !ordersLoading) {
            fetchCustomers(pagination.currentPage, searchQuery);
        }
    }, [pagination.currentPage, searchQuery, ordersLoading]);

    // CRUD Handlers
    const saveCustomer = async (customerData: Customer) => {
        setLoading(true);
        const isNew = customerData.id === 0;
        const url = isNew ? API_CUSTOMERS_URL : `${API_CUSTOMERS_URL}${customerData.id}/`;
        const method = isNew ? 'POST' : 'PUT';

        try {
            const response = await apiFetch<any>(url, {
                method,
                body: JSON.stringify({
                    name: customerData.name,
                    phone: customerData.phone,
                    created_by: 1
                })
            });

            const savedCustomer: Customer = isNew ? response : customerData;

            // OPTIMIZATION 5: Optimistic Update
            // Update allCustomers state immediately without refetching from DB
            if (isNew) {
                setAllCustomers(prev => [savedCustomer, ...prev]);
            } else {
                setAllCustomers(prev => prev.map(c => c.id === savedCustomer.id ? savedCustomer : c));
            }

            // Refresh paginated view
            await fetchCustomers(pagination.currentPage, searchQuery);

            setIsModalOpen(false);
            alert(`Customer ${isNew ? 'created' : 'updated'} successfully!`);
        } catch (err: any) {
            console.error("Error saving customer:", err);
            if (err.message === "Unauthorized") {
                setError("Session expired. Please login again.");
            } else {
                setError(`Failed to save customer: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const deleteCustomer = async (id: number, name: string) => {
        if (!window.confirm(`Are you sure you want to delete customer: ${name}? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        try {
            await apiFetch<void>(`${API_CUSTOMERS_URL}${id}/`, {
                method: 'DELETE'
            });

            // OPTIMIZATION 6: Optimistic Delete
            setAllCustomers(prev => prev.filter(c => c.id !== id));

            await fetchCustomers(pagination.currentPage, searchQuery);

            setIsDetailModalOpen(false);
            alert(`Customer ${name} deleted successfully.`);
        } catch (err: any) {
            console.error("Error deleting customer:", err);
            if (err.message === "Unauthorized") {
                setError("Session expired. Please login again.");
            } else {
                setError(`Failed to delete customer: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const viewCustomerDetails = (customer: Customer) => {
        setCurrentCustomer(customer);
        setIsDetailModalOpen(true);
    };

    const editCustomer = (customer: Customer) => {
        setCurrentCustomer(customer);
        setIsModalOpen(true);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (page: number) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    };

    const handleNextPage = () => {
        if (pagination.next) {
            setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
        }
    };

    const handlePrevPage = () => {
        if (pagination.previous) {
            setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
        }
    };

    if (loading && customers.length === 0) return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center p-8 text-gray-500">
                    <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" />
                    <p>Loading customer data...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-4 text-xs text-gray-500">
                    <div className="flex space-x-4">
                        <span>Orders Loaded: {orders.length}</span>
                        <span>Customers: {customers.length}</span>
                    </div>
                </div>

                {/* Search Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={() => { setCurrentCustomer(null); setIsModalOpen(true); }} className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm">
                            <PlusCircle className="w-5 h-5 mr-2" />
                            Add New Customer
                        </button>
                        <button onClick={() => setIsSMSModalOpen(true)} className="inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm" disabled={loading}>
                            <MessageSquare className="w-5 h-5 mr-2" />
                            Send SMS to All ({allCustomers.length} customers)
                        </button>
                        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                            <div className="flex-1 relative">
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Search by name or phone number..." />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            </div>
                            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center">
                                <Search className="w-4 h-4 mr-2" />
                                Search
                            </button>
                        </form>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card icon={Users} title="Total Customers" value={pagination.totalItems} colorClass="blue" />
                    <Card icon={ShoppingBag} title="Current Page Results" value={customers.length} colorClass="green" />
                    <Card icon={ChartLine} title="Total Orders" value={orders.length} colorClass="purple" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Customers List</h2>
                                <div className="text-sm text-gray-600 mt-1">Page {pagination.currentPage} of {pagination.totalPages} • Total: {pagination.totalItems} customers</div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Billed</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {customers.length > 0 ? (
                                    customers.map((customer) => {
                                        // OPTIMIZATION 7: Use Map Lookup instead of Filtering
                                        const stats = customerStatsMap.get(customer.id) || { orderCount: 0, totalBilled: 0, lastOrderDate: null };

                                        return (
                                            <tr key={customer.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                                            <User className="text-white w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                                            
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{customer.phone}</div>
                                                   
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                        <ShoppingBag className="w-3 h-3 mr-1" />
                                                        {stats.orderCount}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-green-600">KSh {stats.totalBilled.toFixed(2)}</div>
                                                    
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {stats.lastOrderDate ? (
                                                            new Date(stats.lastOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                        ) : (
                                                            <span className="text-gray-400">Never</span>
                                                        )}
                                                    </div>
                                                    
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => viewCustomerDetails(customer)} className="inline-flex items-center p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors duration-200" title="View Details"><Eye className="w-4 h-4" /></button>
                                                        <button onClick={() => editCustomer(customer)} className="inline-flex items-center p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors duration-200" title="Edit Customer"><Edit className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteCustomer(customer.id, customer.name)} className="inline-flex items-center p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200" title="Delete Customer"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="text-gray-400 mb-4"><Users className="w-12 h-12 mx-auto" /></div>
                                            <p className="text-gray-500 text-lg">No customers found</p>
                                            <p className="text-gray-400 text-sm mt-2">Try adjusting your search criteria or add a new customer</p>
                                            <button onClick={() => { setCurrentCustomer(null); setIsModalOpen(true); }} className="inline-block mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200">Add First Customer</button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                <div className="text-sm text-gray-700">Page {pagination.currentPage} of {pagination.totalPages}</div>
                                <div className="flex space-x-2">
                                    <button onClick={handlePrevPage} disabled={!pagination.previous} className={`px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium ${!pagination.previous ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'} transition-colors duration-200 flex items-center`}><ChevronLeft className="w-4 h-4 mr-1" /> Previous</button>
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (pagination.totalPages <= 5) pageNum = i + 1;
                                        else if (pagination.currentPage <= 3) pageNum = i + 1;
                                        else if (pagination.currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                        else pageNum = pagination.currentPage - 2 + i;
                                        return (
                                            <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`px-4 py-2 border rounded-md text-sm font-medium ${pagination.currentPage === pageNum ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'} transition-colors duration-200`}>{pageNum}</button>
                                        );
                                    })}
                                    <button onClick={handleNextPage} disabled={!pagination.next} className={`px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium ${!pagination.next ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'} transition-colors duration-200 flex items-center`}>Next<ChevronRight className="w-4 h-4 ml-1" /></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <CustomerFormModal
                    customer={currentCustomer}
                    onSave={saveCustomer}
                    onClose={() => { setIsModalOpen(false); setCurrentCustomer(null); }}
                />
            )}

            {isDetailModalOpen && currentCustomer && (
                <CustomerDetailModal
                    customer={currentCustomer}
                    orders={orders}
                    onClose={() => { setIsDetailModalOpen(false); setCurrentCustomer(null); }}
                    onEdit={() => { setIsDetailModalOpen(false); setIsModalOpen(true); }}
                    onDelete={() => deleteCustomer(currentCustomer.id, currentCustomer.name)}
                />
            )}

            <SMSModal
                isOpen={isSMSModalOpen}
                onClose={() => setIsSMSModalOpen(false)}
                onSend={sendBulkSMS}
                customerCount={allCustomers.length}
                isSending={isSendingSMS}
            />
        </div>
    );
}