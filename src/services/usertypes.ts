// utils/userType.ts
export const getUserType = (userData: any): 'admin' | 'staff' | null => {
    if (!userData) return null;

    // Admin: is_superuser is true OR user_type is 'admin'
    const isAdmin = userData.is_superuser === true || userData.user_type === 'admin';

    // Staff: not admin AND (user_type is 'staff' OR is_staff is true)
    const isStaff = !isAdmin && (userData.user_type === 'staff' || userData.is_staff === true);

    if (isAdmin) return 'admin';
    if (isStaff) return 'staff';
    return null;
};

export const isAdminUser = (userData: any): boolean => {
    return getUserType(userData) === 'admin';
};

export const isStaffUser = (userData: any): boolean => {
    return getUserType(userData) === 'staff';
};