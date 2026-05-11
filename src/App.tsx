import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { getAccessToken, getUserRole, getSelectedShop } from "@/utils/auth";
import { ROUTES } from "./services/Routes";

// Lazy load all pages. These will now be split into separate files during build.
const LaundryLanding = lazy(() => import("./pages/website"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Maindashboard"));
const PerformanceReport = lazy(() => import("./pages/PerformanceReport"));
const SiteManagement = lazy(() => import("./pages/SiteManagement"));
const LaundryDashboard = lazy(() => import("./pages/LaundryDashboard"));
const CreateOrder = lazy(() => import("./pages/CreateOrder"));
const Orders = lazy(() => import("./pages/Orders"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const Expenses = lazy(() => import("./pages/Expenses"));
const FoodItems = lazy(() => import("./pages/foodItemspage"));
const HotelOrders = lazy(() => import("./pages/HotelOrders"));
const HotelExpenses = lazy(() => import("./pages/HotelExpenses"));
const UserProfile = lazy(() => import("./pages/user-profile"));

const queryClient = new QueryClient();

// --- LOADING COMPONENT ---
// This is shown while the lazy-loaded component is being fetched.
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0db5f7]"></div>
      <p className="text-slate-500 text-sm animate-pulse">Loading...</p>
    </div>
  </div>
);

// Types
type ShopType = 'Shop A' | 'Shop B' | null;
type AppShopType = 'laundry' | 'hotel' | null;

// Helper to convert ShopType to AppShopType
const getShopIdFromType = (shopType: ShopType): AppShopType => {
  if (!shopType) return null;

  const shopMapping: Record<string, 'laundry' | 'hotel'> = {
    'Shop A': 'laundry',
    'Shop B': 'hotel',
  };

  return shopMapping[shopType] || null;
};

// Protected Route wrapper with role-based access control
interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  shopType?: "laundry" | "hotel";
}

const ProtectedRoute = ({
  children,
  adminOnly = false,
  shopType
}: ProtectedRouteProps) => {
  const token = getAccessToken();
  const userRole = getUserRole();
  const selectedShop = getSelectedShop();
  const appSelectedShop = getShopIdFromType(selectedShop);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (userRole === "staff" && !selectedShop) {
    return <Navigate to="/login" replace state={{ needsShopSelection: true }} />;
  }

  if (adminOnly && userRole !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  if (userRole === "staff" && shopType && appSelectedShop !== shopType) {
    if (appSelectedShop === "laundry") {
      return <Navigate to={ROUTES.laundryDashboard} replace />;
    } else if (appSelectedShop === "hotel") {
      return <Navigate to={ROUTES.fooditems} replace />;
    }
  }

  return <>{children}</>;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "staff" | null>(null);
  const [selectedShop, setSelectedShop] = useState<ShopType>(null);

  useEffect(() => {
    const token = getAccessToken();
    const role = getUserRole();
    const shop = getSelectedShop();

    setIsAuthenticated(!!token);
    setUserRole(role);
    setSelectedShop(shop);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const getRootRedirect = () => {
    if (!isAuthenticated) {
      return "/home";
    }

    if (userRole === "admin") {
      return ROUTES.dashboard;
    }

    if (userRole === "staff") {
      const appSelectedShop = getShopIdFromType(selectedShop);
      if (appSelectedShop === "laundry") return ROUTES.laundryDashboard;
      if (appSelectedShop === "hotel") return ROUTES.fooditems;
    }

    return "/home";
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* 
                PUBLIC LANDING PAGE 
              */}
              <Route
                path="/home"
                element={
                  <div className="min-h-screen w-full">
                    <LaundryLanding />
                  </div>
                }
              />

              {/* 
                ROOT REDIRECT (/)
              */}
              <Route
                path="/"
                element={<Navigate to={getRootRedirect()} replace />}
              />

              {/* Public Login Route */}
              <Route path="/login" element={<Login />} />

              {/* 
                PROTECTED ROUTES 
              */}
              {isAuthenticated ? (
                <>
                  {/* Admin Routes */}
                  <Route
                    path={ROUTES.dashboard}
                    element={
                      <ProtectedRoute adminOnly>
                        <MainLayout>
                          <Dashboard />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.reports}
                    element={
                      <ProtectedRoute adminOnly>
                        <MainLayout>
                          <PerformanceReport />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.siteManagement}
                    element={
                      <ProtectedRoute adminOnly>
                        <MainLayout>
                          <SiteManagement />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Laundry Routes */}
                  <Route
                    path={ROUTES.laundryDashboard}
                    element={
                      <ProtectedRoute shopType="laundry">
                        <MainLayout>
                          <LaundryDashboard />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.laundryCreateOrder}
                    element={
                      <ProtectedRoute shopType="laundry">
                        <MainLayout>
                          <CreateOrder />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.laundryOrders}
                    element={
                      <ProtectedRoute shopType="laundry">
                        <MainLayout>
                          <Orders />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.laundryCustomers}
                    element={
                      <ProtectedRoute shopType="laundry">
                        <MainLayout>
                          <CustomersPage />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.laundryExpenses}
                    element={
                      <ProtectedRoute shopType="laundry">
                        <MainLayout>
                          <Expenses />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Hotel Routes */}
                  <Route
                    path={ROUTES.fooditems}
                    element={
                      <ProtectedRoute shopType="hotel">
                        <MainLayout>
                          <FoodItems />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.hotelOrders}
                    element={
                      <ProtectedRoute shopType="hotel">
                        <MainLayout>
                          <HotelOrders />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.hotelExpenses}
                    element={
                      <ProtectedRoute shopType="hotel">
                        <MainLayout>
                          <HotelExpenses />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Shared Routes */}
                  <Route
                    path={ROUTES.userprofile}
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <UserProfile />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </>
              ) : (
                <Route path="*" element={<Navigate to="/login" replace />} />
              )}
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
