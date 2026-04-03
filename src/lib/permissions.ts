import { prisma } from './prisma';
import { PermissionAction, PermissionResource } from '@prisma/client';

/**
 * Check if a user has a specific permission
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

        if (!user || !user.userRole) {
            return false;
        }

        // Check if user's role has the specific permission
        const hasSpecificPermission = user.userRole.permissions.some(
            p => p.action === action && p.resource === resource
        );

        // Check if user's role has MANAGE permission for the resource (grants all actions)
        const hasManagePermission = user.userRole.permissions.some(
            p => p.action === 'MANAGE' && p.resource === resource
        );

        return hasSpecificPermission || hasManagePermission;
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
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
