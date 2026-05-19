// utils/auth.ts

import { User } from "@/services/types";

export type UserRole = 'admin' | 'staff';
export type ShopType = 'Shop A' | 'Shop B' | null;

const isBrowser = () => typeof window !== 'undefined';
const AUTH_CHANGE_EVENT = 'auth:changed';

/* ------------------------------------------------------------------ */
/* Storage Utilities                                                   */
/* ------------------------------------------------------------------ */

const getFromStorage = <T = unknown>(key: string): T | null => {
    if (!isBrowser()) return null;

    const value = localStorage.getItem(key);
    if (!value) return null;

    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
};

const setToStorage = (key: string, value: unknown): void => {
    if (!isBrowser()) return;

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Silently fail on storage errors
    }
};

const removeFromStorage = (key: string): void => {
    if (!isBrowser()) return;
    localStorage.removeItem(key);
};

export const notifyAuthChanged = (): void => {
    if (!isBrowser()) return;
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

export const subscribeToAuthChanges = (callback: () => void): (() => void) => {
    if (!isBrowser()) return () => undefined;

    const handleStorage = () => callback();
    const handleAuthChanged = () => callback();

    window.addEventListener('storage', handleStorage);
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChanged);

    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChanged);
    };
};

/* ------------------------------------------------------------------ */
/* Token Management                                                    */
/* ------------------------------------------------------------------ */

export const getAccessToken = (): string | null => {
    if (!isBrowser()) return null;
    return localStorage.getItem('access_token') || localStorage.getItem('accessToken');
};

export const getRefreshToken = (): string | null => {
    if (!isBrowser()) return null;
    return localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
};

export const setAuthTokens = (accessToken: string, refreshToken: string): void => {
    if (!isBrowser()) return;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    // Backward compatibility
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    notifyAuthChanged();
};

export const clearAuthTokens = (): void => {
    if (!isBrowser()) return;

    ['access_token', 'refresh_token', 'accessToken', 'refreshToken', 'tokenExpiry'].forEach(
        key => localStorage.removeItem(key)
    );
};

/* ------------------------------------------------------------------ */
/* User Data Management                                                */
/* ------------------------------------------------------------------ */

export const getUserData = (): User | null => {
    return getFromStorage<User>('current_user');
};

export const setUserData = (userData: User): void => {
    setToStorage('current_user', userData);
    notifyAuthChanged();
};

export const setUserEmail = (email: string): void => {
    const userData = getUserData();
    if (!userData) return;

    setUserData({ ...userData, email });
};

/* ------------------------------------------------------------------ */
/* Shop Management                                                     */
/* ------------------------------------------------------------------ */

const SHOP_MAPPING = {
    'laundry': 'Shop A' as const,
    'hotel': 'Shop B' as const
} as const;

const REVERSE_SHOP_MAPPING = {
    'Shop A': 'laundry' as const,
    'Shop B': 'hotel' as const
} as const;

export const getSelectedShop = (): ShopType => {
    if (!isBrowser()) return null;
    const shop = localStorage.getItem('selected_shop') as ShopType;
    return shop || null;
};

export const setSelectedShop = (shop: ShopType): void => {
    if (!isBrowser()) return;
    if (shop) {
        localStorage.setItem('selected_shop', shop);
    } else {
        localStorage.removeItem('selected_shop');
    }
    notifyAuthChanged();
};

export const setSelectedShopByType = (shopType: 'laundry' | 'hotel'): void => {
    setSelectedShop(SHOP_MAPPING[shopType]);
};

export const getSelectedShopType = (): 'laundry' | 'hotel' | null => {
    const shop = getSelectedShop();
    return shop ? REVERSE_SHOP_MAPPING[shop] || null : null;
};

export const inferShopTypeFromUser = (user = getUserData()): 'laundry' | 'hotel' | null => {
    if (!user) return null;
    const userWithShop = user as User & Partial<Record<
        'shop' | 'shop_type' | 'selected_shop' | 'assigned_shop' | 'assigned_shop_type',
        unknown
    >>;

    const rawValues = [
        userWithShop.shop,
        userWithShop.shop_type,
        userWithShop.selected_shop,
        userWithShop.assigned_shop,
        userWithShop.assigned_shop_type,
        ...(Array.isArray(userWithShop.groups) ? userWithShop.groups : []),
        ...(Array.isArray(userWithShop.user_permissions) ? userWithShop.user_permissions : []),
    ];

    const haystack = rawValues
        .filter(Boolean)
        .map(value => String(value).toLowerCase())
        .join(' ');

    if (haystack.includes('hotel') || haystack.includes('shop b')) return 'hotel';
    if (haystack.includes('laundry') || haystack.includes('shop a')) return 'laundry';
    return null;
};

export const clearSelectedShop = (): void => {
    removeFromStorage('selected_shop');
    notifyAuthChanged();
};

/* ------------------------------------------------------------------ */
/* User & Role Helpers                                                 */
/* ------------------------------------------------------------------ */

export const getUserRole = (): UserRole | null => {
    const user = getUserData();
    if (!user) return null;

    if (user.user_type === 'admin' || user.is_superuser) return 'admin';
    if (user.user_type === 'staff' || user.is_staff) return 'staff';
    return null;
};

export const isAdmin = () => getUserRole() === 'admin';
export const isStaff = () => getUserRole() === 'staff';

export const getUserEmail = (): string => getUserData()?.email ?? '';

export const getUserFullName = (): string => {
    const user = getUserData();
    if (!user) return '';

    const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    return fullName || user.email || '';
};

/* ------------------------------------------------------------------ */
/* Auth State Validation                                               */
/* ------------------------------------------------------------------ */

const validateToken = (token: string): boolean => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

export const validateAuthState = (): boolean => {
    if (!isBrowser()) return false;

    const token = getAccessToken();
    const user = getUserData();

    if (!token || !user) return false;
    return validateToken(token);
};

export const isAuthenticated = (): boolean => validateAuthState();

/* ------------------------------------------------------------------ */
/* Complete Auth Cleanup                                               */
/* ------------------------------------------------------------------ */

export const clearAuthData = (): void => {
    if (!isBrowser()) return;

    localStorage.clear();
    sessionStorage.clear();
    notifyAuthChanged();
};

/* ------------------------------------------------------------------ */
/* Helper Functions for API Integration                                */
/* ------------------------------------------------------------------ */

export const getAuthHeaders = (): Record<string, string> => {
    const token = getAccessToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

export const handleLoginSuccess = (data: { access: string; refresh: string; user: User }): void => {
    setAuthTokens(data.access, data.refresh);
    setUserData(data.user);
    notifyAuthChanged();
};

export const handleLogout = (): void => {
    clearAuthData();
};
