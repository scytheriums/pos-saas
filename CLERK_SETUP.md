# Clerk Authentication Setup Guide

## Step 1: Create a Clerk Account

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up for a free account
3. Create a new application
   - Name it "Awan POS" or your preferred name
   - Select "Next.js" as the framework

## Step 2: Get Your API Keys

1. In the Clerk dashboard, go to **API Keys** in the sidebar
2. You'll see two keys:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)

## Step 3: Configure Environment Variables

Create a `.env.local` file in the root of your project (if it doesn't exist) and add:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_here

# Clerk URLs (these are already configured correctly)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

**Important:** Replace `pk_test_your_actual_key_here` and `sk_test_your_actual_secret_here` with your actual keys from Clerk!

## Step 4: Restart the Development Server

After adding the environment variables:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 5: Test Authentication

1. Navigate to `http://localhost:3000/sign-up`
2. Create a new account
3. You'll be redirected to the onboarding page
4. Enter your business name
5. You'll be redirected to the dashboard

## Troubleshooting

### "Missing Publishable Key" Error
- Make sure your `.env.local` file is in the root directory
- Verify the keys are copied correctly (no extra spaces)
- Restart the dev server after adding keys

### "Unauthorized" Error
- Check that your Clerk application is active
- Verify the secret key is correct
- Check browser console for detailed errors

## Next Steps

Once authentication is working:
- All routes except `/`, `/sign-in`, and `/sign-up` will require authentication
- Users will be assigned to their tenant during onboarding
- API routes will use the authenticated user's tenant ID
