import { API_BASE_URL } from "./url";
import { ExpenseField, ExpenseRecord, User } from "./types";
import { handleLoginSuccess } from "@/utils/auth";

class ApiError extends Error {
  status?: number;
  body?: string;

  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/* =====================================================
   TOKEN MANAGEMENT
===================================================== */

let accessToken: string | null = null;
let refreshToken: string | null = null;

// Token storage utilities
const tokenStore = {
  getAccess: (): string | null => accessToken || localStorage.getItem("accessToken"),
  getRefresh: (): string | null => refreshToken || localStorage.getItem("refreshToken"),
  set: (access: string | null, refresh: string | null): void => {
    accessToken = access;
    refreshToken = refresh;

    if (access) {
      localStorage.setItem("accessToken", access);
      // Store token expiry timestamp (assuming 1 hour expiry)
      const expiryTime = Date.now() + 60 * 60 * 1000; // 1 hour from now
      localStorage.setItem("tokenExpiry", expiryTime.toString());
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("tokenExpiry");
    }

    if (refresh) {
      localStorage.setItem("refreshToken", refresh);
    } else {
      localStorage.removeItem("refreshToken");
    }
  },
  clear: (): void => {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tokenExpiry");
  }
};

// Export token functions (maintaining public API)
export const getAccessToken = tokenStore.getAccess;
export const getRefreshToken = tokenStore.getRefresh;
export const setAuthTokens = tokenStore.set;

/* =====================================================
   AUTO-LOGOUT FUNCTIONALITY
===================================================== */

let autoLogoutTimer: NodeJS.Timeout | null = null;

// Session timeout configuration (15 minutes of inactivity)
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

// Initialize auto-logout on module load
const initializeAutoLogout = () => {
  if (typeof window === 'undefined') return;
  
  // Clear any existing timer
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
    autoLogoutTimer = null;
  }

  // Set up activity listeners
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  
  const resetAutoLogoutTimer = () => {
    if (autoLogoutTimer) {
      clearTimeout(autoLogoutTimer);
    }
    
    autoLogoutTimer = setTimeout(() => {
      // Check if user is still authenticated
      const token = tokenStore.getAccess();
      const user = localStorage.getItem("current_user");
      
      if (token && user) {
        console.log('Auto-logout due to inactivity');
        performAutoLogout();
      }
    }, SESSION_TIMEOUT);
  };

  // Attach event listeners
  events.forEach(event => {
    document.addEventListener(event, resetAutoLogoutTimer, { passive: true });
  });

  // Initial setup
  resetAutoLogoutTimer();
};

// Clean up auto-logout
const cleanupAutoLogout = () => {
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
    autoLogoutTimer = null;
  }
  
  // Remove event listeners
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.removeEventListener(event, () => {});
  });
};

// Perform auto logout
const performAutoLogout = () => {
  cleanupAutoLogout();
  tokenStore.clear();
  localStorage.removeItem("current_user");
  
  // Only redirect if not already on login page
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Check token expiry
const checkTokenExpiry = (): boolean => {
  const expiry = localStorage.getItem("tokenExpiry");
  if (!expiry) return true;
  
  const isExpired = Date.now() > parseInt(expiry);
  if (isExpired) {
    console.log('Token has expired');
    return true;
  }
  return false;
};

/* =====================================================
   CONSTANTS
===================================================== */

const ENDPOINTS = {
  TOKEN: `${API_BASE_URL}/auth/login`,
  REFRESH: `${API_BASE_URL}/auth/refresh`,
  ME: `${API_BASE_URL}/auth/me`
} as const;

const DEFAULT_HEADERS = { "Content-Type": "application/json" };

/* =====================================================
   USER UTILITIES
===================================================== */

const normalizeUser = (data: any, fallbackEmail = ""): User => ({
  id: data?.id || data?.pk || 0,
  email: data?.email || fallbackEmail,
  user_type: data?.user_type || (data?.is_superuser ? "admin" : "staff"),
  is_superuser: !!data?.is_superuser,
  is_staff: !!data?.is_staff,
  is_active: data?.is_active ?? true,
  first_name: data?.first_name || "",
  last_name: data?.last_name || "",
  groups: data?.groups || [],
  user_permissions: data?.user_permissions || [],
  last_login: data?.last_login || null,
  date_joined: data?.date_joined || new Date().toISOString(),
});

const createDefaultUser = (email: string): User => normalizeUser({ email });

/* =====================================================
   CORE FETCH UTILITIES
===================================================== */

const createHeaders = (token?: string | null): Record<string, string> => {
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const createUrl = (endpoint: string, app: "laundry" | "hotel" | "auth"): string => {
  if (/^https?:\/\//i.test(endpoint) || endpoint.startsWith(API_BASE_URL)) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.replace(/^\/+/, "");
  const base = `${API_BASE_URL}/`;
  switch (app) {
    case "laundry": return `${base}Laundry/${normalizedEndpoint}`;
    case "hotel": return `${base}Hotel/${normalizedEndpoint}`;
    case "auth": return `${base}${normalizedEndpoint}`;
  }
};

const handleError = async (response: Response): Promise<never> => {
  const message = await response.text().catch(() => response.statusText);
  throw new ApiError(`API Error: ${response.status} - ${message || "Unknown error"}`, response.status, message);
};

/* =====================================================
   MAIN FETCH API (Maintaining same interface)
===================================================== */

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
  app: "laundry" | "hotel" | "auth" = "laundry"
): Promise<T> {
  // Check token expiry before making request
  if (checkTokenExpiry()) {
    try {
      await authApi.refreshToken();
    } catch (error) {
      performAutoLogout();
      throw new Error('Session expired. Please login again.');
    }
  }

  const url = createUrl(endpoint, app);
  const token = tokenStore.getAccess();

  const makeRequest = async (authToken?: string) => {
    const headers = createHeaders(authToken);
    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 401 by trying to refresh token once
      if (response.status === 401 && authToken && !options?.body?.toString().includes("refresh")) {
        try {
          await authApi.refreshToken();
          const newToken = tokenStore.getAccess();
          if (newToken) {
            return makeRequest(newToken);
          }
        } catch (refreshError) {
          // Refresh failed, proceed with original error
        }
      }
      return handleError(response);
    }

    return response.json();
  };

  return makeRequest(token);
}

/* =====================================================
   AUTH API (Maintaining same interface)
===================================================== */

const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await fetch(ENDPOINTS.TOKEN, {
      method: "POST",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let message = "Login failed. Please try again.";

      if (response.status === 401) {
        message = "Invalid email or password.";
      } else if (response.status === 404) {
        message = "Login service is unavailable. Please make sure the app server is running.";
      } else if (errorText) {
        message = errorText;
      }

      throw new ApiError(message, response.status, errorText);
    }

    const tokenData = await response.json();

    // Get user info
    const userResponse = await fetch(ENDPOINTS.ME, {
      headers: { ...DEFAULT_HEADERS, Authorization: `Bearer ${tokenData.access}` },
    });

    if (!userResponse.ok) throw new Error("Failed to fetch user data");

    const rawUserData = await userResponse.json();
    const userData = rawUserData?.user || rawUserData;
    const user = normalizeUser(userData, credentials.email);

    // Store tokens and user
    tokenStore.set(tokenData.access, tokenData.refresh);
    localStorage.setItem("current_user", JSON.stringify(user));
    handleLoginSuccess({ access: tokenData.access, refresh: tokenData.refresh, user });

    // Initialize auto-logout after successful login
    if (typeof window !== 'undefined') {
      initializeAutoLogout();
    }

    return { access: tokenData.access, refresh: tokenData.refresh, user };
  },

  refreshToken: async () => {
    const refresh = tokenStore.getRefresh();
    if (!refresh) {
      performAutoLogout();
      throw new Error("No refresh token available");
    }

    const response = await fetch(ENDPOINTS.REFRESH, {
      method: "POST",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      performAutoLogout();
      throw new ApiError(errorText || "Token refresh failed", response.status, errorText);
    }

    const data = await response.json();
    tokenStore.set(data.access, refresh);
    return { access: data.access };
  },

  logout: () => {
    cleanupAutoLogout();
    tokenStore.clear();
    localStorage.removeItem("current_user");
    localStorage.removeItem("selected_shop");
  },

  me: async () => {
    // Check token expiry before fetching user data
    if (checkTokenExpiry()) {
      try {
        await authApi.refreshToken();
      } catch (error) {
        performAutoLogout();
        throw new Error('Session expired. Please login again.');
      }
    }

    const token = tokenStore.getAccess();
    if (!token) throw new Error("No authentication token available");

    const response = await fetch(ENDPOINTS.ME, {
      headers: createHeaders(token),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ApiError(errorText || "Failed to fetch user data", response.status, errorText);
    }

    const rawUserData = await response.json();
    const userData = rawUserData?.user || rawUserData;
    const user = normalizeUser(userData);

    // Update local storage
    localStorage.setItem("current_user", JSON.stringify(user));
    handleLoginSuccess({
      access: token,
      refresh: tokenStore.getRefresh() || '',
      user
    });

    return { user };
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const { user } = await authApi.me();
      return user;
    } catch {
      const storedUser = localStorage.getItem("current_user");
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch {
          // JSON parse failed, continue to default
        }
      }
      return createDefaultUser("unknown@example.com");
    }
  },

  checkUserRole: async (): Promise<'admin' | 'staff'> => {
    const user = await authApi.getCurrentUser();
    return (user.user_type === 'admin' || user.is_superuser) ? 'admin' : 'staff';
  }
};

export { authApi };

/* =====================================================
   EXPENSE APIs (Maintaining same interface)
===================================================== */

const createCrudApi = <T>(endpoint: string, app: "laundry" | "hotel" | "auth" = "hotel") => ({
  getAll: () => fetchApi<T[]>(endpoint, undefined, app),
  getById: (id: number) => fetchApi<T>(`${endpoint}${id}/`, undefined, app),
  create: (data: any) => fetchApi<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data)
  }, app),
  update: (id: number, data: Partial<T>) => fetchApi<T>(`${endpoint}${id}/`, {
    method: "PUT",
    body: JSON.stringify(data)
  }, app),
  delete: (id: number) => fetchApi<void>(`${endpoint}${id}/`, {
    method: "DELETE"
  }, app),
});

export const expenseFieldsApi = createCrudApi<ExpenseField>("expense-fields/");
export const expenseRecordsApi = createCrudApi<ExpenseRecord>("expense-records/");

/* =====================================================
   AUTH UTILITIES (Maintaining same interface)
===================================================== */

export const isAuthenticated = () => {
  const hasToken = !!tokenStore.getAccess() && !!localStorage.getItem("current_user");
  if (!hasToken) return false;
  
  // Check token expiry
  return !checkTokenExpiry();
};

export const getSelectedShop = (): "laundry" | "hotel" | null => {
  const shop = localStorage.getItem("selected_shop");
  return shop === "laundry" || shop === "hotel" ? shop : null;
};

export const setSelectedShop = (shop: "laundry" | "hotel") =>
  localStorage.setItem("selected_shop", shop);

export const clearUserData = () => {
  cleanupAutoLogout();
  tokenStore.clear();
  localStorage.removeItem("current_user");
  localStorage.removeItem("selected_shop");
};

// Initialize auto-logout if user is already logged in when module loads
if (typeof window !== 'undefined') {
  const token = tokenStore.getAccess();
  const user = localStorage.getItem("current_user");
  if (token && user && !checkTokenExpiry()) {
    initializeAutoLogout();
  }
}
