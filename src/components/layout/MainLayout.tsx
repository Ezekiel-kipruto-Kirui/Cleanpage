import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, X, User, ChevronDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { authApi } from "@/services/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Import auth utilities
import {
  getUserData,
  getSelectedShop,
  isAdmin,
  isStaff
} from "@/utils/auth";
import{ ROUTES } from "@/services/Routes"

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean;
}

type ShopType = 'Shop A' | 'Shop B' | null; // Updated to match auth.ts

export function MainLayout({ children, title = "Dashboard" }: MainLayoutProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedShop, setSelectedShop] = useState<ShopType>(null); // Updated type

  // Load user data from localStorage on component mount
  useEffect(() => {
    const loadUserData = () => {
      const userData = getUserData();
      const shop = getSelectedShop();

      if (userData) {
        setCurrentUser(userData);
      }

      if (shop) {
        setSelectedShop(shop);
      }
    };

    loadUserData();

    // Listen for storage changes (in case user logs out/in from another tab)
    const handleStorageChange = () => {
      loadUserData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar");
      const sidebarButton = document.getElementById("sidebar-button");

      if (
        isMobile &&
        sidebarOpen &&
        sidebar &&
        sidebarButton &&
        !sidebar.contains(event.target as Node) &&
        !sidebarButton.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, sidebarOpen]);

  // Get user initials for avatar
  const getUserInitials = (user: User) => {
    if (!user) return "U";
    const firstInitial = user.first_name?.charAt(0) || "";
    const lastInitial = user.last_name?.charAt(0) || "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "U";
  };

  // Get only first name for display
  const getUserFirstName = (user: User) => {
    if (!user) return "User";
    return user.first_name?.trim() || "User";
  };

  // Get user role/type display
  const getUserRole = (user: User) => {
    if (!user) return "User";

    if (user.is_superuser) return "Super Admin";
    if (user.user_type === "admin") return "Admin";
    if (user.user_type === "staff") return "Staff";

    return user.user_type || "User";
  };

  // Get shop display name
  const getShopDisplayName = (shop: ShopType): string => {
    if (!shop) return 'No Shop Selected';

    // Map your shop types to display names
    // You can customize this based on your needs
    const shopDisplayNames: Record<string, string> = {
      'Shop A': 'Laundry',
      'Shop B': 'Hotel',
    };

    return shopDisplayNames[shop] || shop;
  };

  // Get shop color for badge
  const getShopColor = (shop: ShopType) => {
    if (!shop) return 'gray';

    const shopColors: Record<string, { bg: string, text: string }> = {
      'Shop A': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'Shop B': { bg: 'bg-green-100', text: 'text-green-800' },
    };

    return shopColors[shop] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authApi.logout();
      toast.success("Logged out successfully!");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear local tokens and redirect
      localStorage.clear();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 h-16 bg-white border-b border-gray-200 z-40 lg:left-64">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          {/* Left side - Menu button and Title */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    id="sidebar-button"
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                  >
                    {sidebarOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <Sidebar />
                </SheetContent>
              </Sheet>
            )}

            {/* Page title */}
            <div className="ml-4">
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center">
            {!currentUser ? (
              // Loading state
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <div className="h-4 w-4 animate-pulse bg-gray-300 rounded-full"></div>
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                </div>
              </div>
            ) : (
              // User menu with logged-in user info - SHOWING ONLY FIRST NAME
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-100">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={`https://ui-avatars.com/api/?name=${getUserInitials(currentUser)}&background=3b82f6&color=ffffff`}
                        alt={getUserFirstName(currentUser)}
                      />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {getUserInitials(currentUser)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">
                          {getUserFirstName(currentUser)} {/* Only show first name */}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </div>
                      <span className="text-xs text-gray-500">
                        {getUserRole(currentUser)}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {/* User info at the top - SIMPLIFIED */}
                  <div className="px-4 py-3 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`https://ui-avatars.com/api/?name=${getUserInitials(currentUser)}&background=3b82f6&color=ffffff`}
                          alt={getUserFirstName(currentUser)}
                        />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {getUserInitials(currentUser)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getUserFirstName(currentUser)} {/* Only first name */}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {currentUser?.first_name}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {getUserRole(currentUser)}
                          </span>
                          {selectedShop && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium`}>
                              {getShopDisplayName(selectedShop)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <a href={ROUTES.userprofile}>
                        <span>My Profile</span>
                    </a>
                    
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar - Desktop */}
      {!isMobile && (
        <div className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 bg-white z-30">
          <Sidebar />
        </div>
      )}

      {/* Main Content */}
      <main className={`
        min-h-screen pt-16 
        ${isMobile ? 'ml-0' : 'ml-0 lg:ml-64'}
      `}>
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" />
      )}
    </div>
  );
}