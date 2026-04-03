-- Migration: Replace Clerk auth with Better Auth
-- Removes clerkUserId, adds Better Auth tables (Session, Account, Verification)
-- Adds Invitation table for team invites

-- 1. Make User.name non-null (fill nulls first)
UPDATE "User" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "name" SET DEFAULT '';

-- 2. Add emailVerified column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- 3. Add image column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- 4. Add role (simple string) column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT;

-- 5. Make tenantId optional
ALTER TABLE "User" ALTER COLUMN "tenantId" DROP NOT NULL;

-- 6. Remove clerkUserId (drop index first, then constraint, then column)
DROP INDEX IF EXISTS "User_clerkUserId_idx";
DROP INDEX IF EXISTS "User_clerkUserId_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "clerkUserId";

-- 7. Add unique constraint on email
ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");

-- 8. Create Session table
CREATE TABLE "Session" (
    "id"        TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token"     TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId"    TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Create Account table
CREATE TABLE "Account" (
    "id"                    TEXT NOT NULL,
    "accountId"             TEXT NOT NULL,
    "providerId"            TEXT NOT NULL,
    "userId"                TEXT NOT NULL,
    "accessToken"           TEXT,
    "refreshToken"          TEXT,
    "idToken"               TEXT,
    "accessTokenExpiresAt"  TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope"                 TEXT,
    "password"              TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Create Verification table
CREATE TABLE "Verification" (
    "id"         TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value"      TEXT NOT NULL,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "createdAt"  TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- 11. Create Invitation table
CREATE TABLE "Invitation" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "role"      TEXT NOT NULL DEFAULT 'cashier',
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accepted"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");
CREATE INDEX "Invitation_tenantId_idx" ON "Invitation"("tenantId");

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
