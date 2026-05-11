import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from "@/services/url";
import { getAccessToken } from "@/services/api";
import {
  User,
  DollarSign,
  AlertCircle,
  Coffee,
  Shirt, // Using Shirt for Laundry context
  Calendar, // Keeping Calendar for aesthetic or dates if needed later
  Wallet,
  TrendingUp
} from 'lucide-react';

// Constants for API endpoints
const USER_PROFILE_URL = `${API_BASE_URL}/me/`;
const LAUNDRY_SUMMARY_URL = `${API_BASE_URL}/Laundry/orders/user_sales_summary/`;
const HOTEL_SUMMARY_URL = `${API_BASE_URL}/Hotel/orders/user_sales_summary/`;

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

// Interfaces for Summary Responses
interface LaundrySummaryItem {
  user_id: number | null;
  email: string | null;
  total_revenue: number;
}

interface HotelSummaryItem {
  user_id: number;
  total_revenue: number;
}

const UserProfile = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Revenue states
  const [laundryRevenue, setLaundryRevenue] = useState(0);
  const [hotelRevenue, setHotelRevenue] = useState(0);

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

      // 1. Fetch User Profile
      const userResponse = await axios.get(USER_PROFILE_URL, {
        headers: getAuthHeader()
      });
      const currentUser = userResponse.data;
      setUser(currentUser);

      // 2. Fetch Laundry Revenue Summary
      try {
        const laundryRes = await axios.get(LAUNDRY_SUMMARY_URL, {
          headers: getAuthHeader()
        });
        
        // Find the entry matching the current user
        const userLaundryData = laundryRes.data.data.find((item: LaundrySummaryItem) => 
          item.user_id === currentUser.id
        );
        setLaundryRevenue(userLaundryData?.total_revenue || 0);
      } catch (err) {
        console.error('Error fetching laundry summary:', err);
      }

      // 3. Fetch Hotel Revenue Summary
      try {
        const hotelRes = await axios.get(HOTEL_SUMMARY_URL, {
          headers: getAuthHeader()
        });

        // Find the entry matching the current user
        const userHotelData = hotelRes.data.data.find((item: HotelSummaryItem) => 
          item.user_id === currentUser.id
        );
        setHotelRevenue(userHotelData?.total_revenue || 0);
      } catch (err) {
        console.error('Error fetching hotel summary:', err);
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

  // Calculated Stats
  const totalRevenue = laundryRevenue + hotelRevenue;

  // Format date (optional usage)
  const formatDate = (dateString: string | Date) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString('en-KE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <label className="text-sm font-medium text-gray-500">Total Revenue Generated</label>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                 <TrendingUp className="w-4 h-4" />
                 <span>Combined earnings from Laundry and Hotel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Laundry Revenue Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl mr-4">
                <Shirt className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {formatCurrency(laundryRevenue)}
                </h3>
                <p className="text-sm text-gray-500">Laundry Sales</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Revenue collected</span>
                <span className="text-green-600 font-medium">Confirmed</span>
              </div>
            </div>
          </div>

          {/* Hotel Revenue Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-xl mr-4">
                <Coffee className="text-orange-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {formatCurrency(hotelRevenue)}
                </h3>
                <p className="text-sm text-gray-500">Hotel Sales</p>
              </div>
            </div>
             <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Revenue collected</span>
                <span className="text-green-600 font-medium">Confirmed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display (Only if loading is done but summary fetch failed partially) */}
        {error && user && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={fetchUserData}
              className="mt-2 text-red-700 hover:text-red-800 text-sm font-medium"
            >
              Try refreshing the stats
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;