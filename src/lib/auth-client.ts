import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    tenantId?: string | null;
    role?: string | null;
    createdAt: Date;
    updatedAt: Date;
};
