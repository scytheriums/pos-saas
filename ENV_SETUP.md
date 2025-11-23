# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_saas"

# Clerk Authentication
# Get these from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

## Getting Clerk API Keys

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up or sign in
3. Create a new application
4. Go to "API Keys" in the sidebar
5. Copy the Publishable Key and Secret Key
6. Paste them into your `.env.local` file
