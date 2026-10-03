/**
 * Which permission each dashboard page needs ("ACTION:RESOURCE"), matched by path prefix.
 * Used to hide navigation and guard pages; the API enforces the same rules on its own.
 * Longest matching prefix wins; paths not listed are open to every signed-in user.
 */
const PAGE_PERMISSIONS: [prefix: string, permission: string][] = [
    ['/pos', 'CREATE:ORDERS'],
    ['/dashboard/analytics', 'VIEW:ANALYTICS'],
    ['/dashboard/products', 'VIEW:PRODUCTS'],
    ['/dashboard/categories', 'VIEW:CATEGORIES'],
    ['/dashboard/promotions', 'VIEW:DISCOUNTS'],
    ['/dashboard/inventory', 'VIEW:INVENTORY'],
    ['/dashboard/suppliers', 'VIEW:PURCHASING'],
    ['/dashboard/purchase-orders', 'VIEW:PURCHASING'],
    ['/dashboard/orders', 'VIEW:ORDERS'],
    ['/dashboard/returns', 'VIEW:RETURNS'],
    ['/dashboard/shifts', 'VIEW:ORDERS'],
    ['/dashboard/expenses', 'VIEW:EXPENSES'],
    ['/dashboard/customers', 'VIEW:CUSTOMERS'],
    ['/dashboard/users', 'VIEW:USERS'],
    ['/dashboard/settings/roles', 'VIEW:USERS'],
    ['/dashboard/settings', 'EDIT:SETTINGS'],
    ['/dashboard/audit-logs', 'VIEW:SETTINGS'],
];

export function requiredPermission(pathname: string): string | null {
    let best: [string, string] | null = null;
    for (const entry of PAGE_PERMISSIONS) {
        const [prefix] = entry;
        if ((pathname === prefix || pathname.startsWith(prefix + '/')) && (!best || prefix.length > best[0].length)) {
            best = entry;
        }
    }
    return best ? best[1] : null;
}

export function canAccessPath(pathname: string, permissions: string[] | null): boolean {
    if (permissions === null) return true; // still loading: don't hide anything yet
    const needed = requiredPermission(pathname);
    return !needed || permissions.includes(needed);
}

/** Where to send someone after sign-in, or when they land on a page they can't use. */
export function homePath(permissions: string[] | null): string {
    if (canAccessPath('/dashboard/analytics', permissions)) return '/dashboard/analytics';
    if (canAccessPath('/pos', permissions)) return '/pos';
    return '/dashboard/orders';
}
