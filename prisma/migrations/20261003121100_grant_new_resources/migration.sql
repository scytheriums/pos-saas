-- Give existing built-in roles the new permissions, matching ROLE_TEMPLATES in src/lib/permissions.ts.
-- (Separate migration: a new enum value can't be used in the transaction that adds it.)

-- Owner and Manager: full control of returns, purchasing and expenses
INSERT INTO "Permission" ("id", "action", "resource", "roleId")
SELECT gen_random_uuid()::text, 'MANAGE'::"PermissionAction", r.resource::"PermissionResource", ur."id"
FROM "UserRole" ur
CROSS JOIN (VALUES ('RETURNS'), ('PURCHASING'), ('EXPENSES')) AS r(resource)
WHERE ur."name" IN ('Owner', 'Manager')
ON CONFLICT ("roleId", "action", "resource") DO NOTHING;

-- Cashier: can view and log returns (approval stays with managers)
INSERT INTO "Permission" ("id", "action", "resource", "roleId")
SELECT gen_random_uuid()::text, a.action::"PermissionAction", 'RETURNS'::"PermissionResource", ur."id"
FROM "UserRole" ur
CROSS JOIN (VALUES ('VIEW'), ('CREATE')) AS a(action)
WHERE ur."name" = 'Cashier'
ON CONFLICT ("roleId", "action", "resource") DO NOTHING;
