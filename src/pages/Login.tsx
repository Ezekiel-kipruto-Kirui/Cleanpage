// pages/Login.tsx
import { useState, useEffect } from "react";
import { useNavigate, NavigateFunction } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/services/Routes";
import { getUserRole, getSelectedShopType, setSelectedShopByType, isAdmin, isStaff } from "@/utils/auth";

/**
 * Clears all authentication data from local storage.
 * Used to handle session expiry or logout.
 */
const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("current_user");
  localStorage.removeItem("selected_shop_type");
};

/**
 * Checks if user is logged in and redirects appropriately.
 * Returns true if redirection occurred, false otherwise.
 */
const checkAndRedirect = (navigate: NavigateFunction): boolean => {
  const userRole = getUserRole();
  const savedShop = getSelectedShopType();

  if (userRole === 'admin') {
    navigate(ROUTES.dashboard, { replace: true });
    return true;
  }

  if (userRole === 'staff' && savedShop) {
    if (savedShop === 'laundry') {
      navigate(ROUTES.laundryDashboard, { replace: true });
    } else if (savedShop === 'hotel') {
      navigate(ROUTES.hotelOrders, { replace: true });
    }
    return true;
  }

  return false;
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showShopSelection, setShowShopSelection] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const isRedirecting = checkAndRedirect(navigate);

    // If we are not redirecting (no valid session), ensure any stale/expired data is cleared.
    // This handles the case where the user was redirected here due to a 401 session expiry.
    if (!isRedirecting) {
      clearSession();
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setLoginError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setLoginError(null);

    try {
      const response = await authApi.login({ email, password });

      if (!response?.user) {
        throw new Error("Invalid response from server");
      }

      // Determine logic based on role
      if (isAdmin()) {
        toast.success("Login successful! Welcome Admin.");
        navigate(ROUTES.dashboard, { replace: true });
      } else if (isStaff()) {
        const savedShop = getSelectedShopType();

        if (savedShop) {
          handleShopSelection(savedShop); // Redirect to saved shop
        } else {
          toast.success("Login successful! Please select your shop.");
          setShowShopSelection(true);
        }
      } else {
        // Fallback for unknown user types
        toast.success("Login successful! Please select your shop.");
        setShowShopSelection(true);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      // If error is 401 or Unauthorized, explicitly clear session
      if (error.response?.status === 401 || error.message?.includes("Unauthorized")) {
        clearSession();
        setLoginError("Session expired or invalid credentials.");
      } else {
        setLoginError(error.message || "Login failed. Please try again.");
      }
      
      toast.error(loginError || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShopSelection = (shop: "laundry" | "hotel") => {
    setSelectedShopByType(shop);
    setShowShopSelection(false);

    if (shop === 'laundry') {
      navigate(ROUTES.laundryDashboard, { replace: true });
      toast.success("Welcome to Laundry Dashboard!");
    } else {
      navigate(ROUTES.fooditems, { replace: true });
      toast.success("Welcome to Hotel Dashboard!");
    }
  };

  return (
    <>
      <div
        className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center relative"
        style={{ backgroundImage: `url('/bg.png')` }}
      >
        <div className="absolute inset-0 bg-black/40"></div>

        <div className="max-w-md w-full relative z-10">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-8 px-8 relative overflow-hidden">
              <div className="flex items-center justify-center relative z-10">
                <div className="bg-blue-500 rounded-full shadow-xl flex items-center justify-center w-20 h-20">
                  <img
                    src="/Clean-page-logo.png"
                    alt="Clean Page Laundry Logo"
                    className="w-full rounded-full object-contain"
                  />
                </div>
              </div>
              <p className="mt-4 text-center text-blue-100 text-sm font-medium">
                Sign in to your Clean Page Laundry account
              </p>
            </div>

            {/* Form */}
            <div className="px-6 py-8">
              {loginError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm">{loginError}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-[0.99]"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Selection Dialog */}
      <Dialog open={showShopSelection} onOpenChange={setShowShopSelection}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Select Your Shop</DialogTitle>
            <DialogDescription className="text-center">
              Welcome! Please select the shop you want to access.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
            <Card
              className="cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all duration-200 group"
              onClick={() => handleShopSelection('laundry')}
            >
              <CardHeader className="text-center group-hover:bg-blue-50 transition-colors rounded-lg">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <CardTitle className="text-lg">Laundry Shop</CardTitle>
                <CardDescription>Manage laundry orders</CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg hover:border-green-500 transition-all duration-200 group"
              onClick={() => handleShopSelection('hotel')}
            >
              <CardHeader className="text-center group-hover:bg-green-50 transition-colors rounded-lg">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <CardTitle className="text-lg">Hotel Shop</CardTitle>
                <CardDescription>Manage hotel food & orders</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}