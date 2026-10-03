import { prisma } from './prisma';
import { PermissionAction, PermissionResource } from '@prisma/client';

/**
 * Check if a user has a specific permission.
 * Owners can do everything. Users without a custom role fall back to the
 * built-in template for their role (manager / cashier).
 */
export async function hasPermission(
    userId: string,
    action: PermissionAction,
    resource: PermissionResource
): Promise<boolean> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                userRole: {
                    include: {
                        permissions: true
                    }
                }
            }
        });

        if (!user) {
            return false;
        }

        if (user.role === 'owner') {
            return true;
        }

        const permissions: { action: PermissionAction; resource: PermissionResource }[] =
            user.userRole?.permissions ?? templateFor(user.role)?.permissions ?? [];

        // MANAGE on a resource grants every action on it
        return permissions.some(
            p => p.resource === resource && (p.action === action || p.action === PermissionAction.MANAGE)
        );
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
}

function templateFor(role: string | null) {
    if (role === 'manager') return ROLE_TEMPLATES.Manager;
    if (role === 'cashier') return ROLE_TEMPLATES.Cashier;
    return null;
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            userRole: {
                include: {
                    permissions: true
                }
            }
        }
    });

    return user?.userRole?.permissions || [];
}

/**
 * Predefined role templates for easy setup
 */

export const ROLE_TEMPLATES = {
    Owner: {
        name: 'Owner',
        description: 'Full system access',
        permissions: Object.values(PermissionResource).map(resource => ({
            action: PermissionAction.MANAGE,
            resource,
        })),
    },
    Manager: {
        name: 'Manager',
        description: 'POS + Report access',
        permissions: [
            { action: PermissionAction.MANAGE, resource: PermissionResource.PRODUCTS },
            { action: PermissionAction.MANAGE, resource: PermissionResource.INVENTORY },
            { action: PermissionAction.MANAGE, resource: PermissionResource.ORDERS },
            { action: PermissionAction.MANAGE, resource: PermissionResource.CUSTOMERS },
            { action: PermissionAction.MANAGE, resource: PermissionResource.DISCOUNTS },
            { action: PermissionAction.MANAGE, resource: PermissionResource.CATEGORIES },
            { action: PermissionAction.VIEW, resource: PermissionResource.ANALYTICS },
            { action: PermissionAction.MANAGE, resource: PermissionResource.RETURNS },
            { action: PermissionAction.MANAGE, resource: PermissionResource.PURCHASING },
            { action: PermissionAction.MANAGE, resource: PermissionResource.EXPENSES },
        ],
    },
    Cashier: {
        name: 'Cashier',
        description: 'POS only',
        permissions: [
            { action: PermissionAction.VIEW, resource: PermissionResource.PRODUCTS },
            { action: PermissionAction.VIEW, resource: PermissionResource.INVENTORY },
            { action: PermissionAction.CREATE, resource: PermissionResource.ORDERS },
            { action: PermissionAction.VIEW, resource: PermissionResource.ORDERS },
            { action: PermissionAction.VIEW, resource: PermissionResource.CUSTOMERS },
            { action: PermissionAction.CREATE, resource: PermissionResource.CUSTOMERS },
            { action: PermissionAction.VIEW, resource: PermissionResource.DISCOUNTS },
            // Cashiers can log a return; a manager approves it
            { action: PermissionAction.VIEW, resource: PermissionResource.RETURNS },
            { action: PermissionAction.CREATE, resource: PermissionResource.RETURNS },
        ],
    },
};


/**
 * Create default roles for a tenant
 */
export async function createDefaultRoles(tenantId: string) {
    const rolesToCreate = Object.values(ROLE_TEMPLATES);

    for (const template of rolesToCreate) {
        // Check if role already exists
        const existing = await prisma.userRole.findUnique({
            where: {
                tenantId_name: {
                    tenantId,
                    name: template.name
                }
            }
        });

        if (!existing) {
            await prisma.userRole.create({
                data: {
                    name: template.name,
                    description: template.description,
                    tenantId,
                    isDefault: template.name === 'Owner', // Owner is default
                    permissions: {
                        create: template.permissions
                    }
                }
            });
        }
    }
}
