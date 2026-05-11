// utils/auth.ts

import { User } from "@/services/types";

export type UserRole = 'admin' | 'staff';
export type ShopType = 'Shop A' | 'Shop B' | null;

const isBrowser = () => typeof window !== 'undefined';

/* ------------------------------------------------------------------ */
/* Storage Utilities                                                   */
/* ------------------------------------------------------------------ */

const getFromStorage = <T = any>(key: string): T | null => {
    if (!isBrowser()) return null;

    const value = localStorage.getItem(key);
    if (!value) return null;

    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
};

const setToStorage = (key: string, value: any): void => {
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
};

export const clearAuthTokens = (): void => {
    if (!isBrowser()) return;

    ['access_token', 'refresh_token', 'accessToken', 'refreshToken'].forEach(
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
    shop ? localStorage.setItem('selected_shop', shop) : localStorage.removeItem('selected_shop');
};

export const setSelectedShopByType = (shopType: 'laundry' | 'hotel'): void => {
    setSelectedShop(SHOP_MAPPING[shopType]);
};

export const getSelectedShopType = (): 'laundry' | 'hotel' | null => {
    const shop = getSelectedShop();
    return shop ? REVERSE_SHOP_MAPPING[shop] || null : null;
};

export const clearSelectedShop = (): void => {
    removeFromStorage('selected_shop');
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

    ['current_user', 'selected_shop'].forEach(removeFromStorage);
    clearAuthTokens();
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
};

export const handleLogout = (): void => {
    clearAuthData();
};