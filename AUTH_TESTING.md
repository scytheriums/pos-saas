# Manual Authentication Testing Guide

## Prerequisites
- Clerk API keys configured in `.env.local`
- Dev server running (`npm run dev`)

## Test Flow

### 1. Sign Up (New User)
1. Navigate to `http://localhost:3000/sign-up`
2. Enter your email and password
3. Click "Continue"
4. **Check your email** for Clerk verification link
5. Click the verification link in your email
6. You'll be redirected to `/onboarding`

### 2. Onboarding (Create Tenant)
1. On the onboarding page, enter your business name (e.g., "My Coffee Shop")
2. Click "Complete Setup"
3. You should be redirected to `/dashboard`

### 3. Verify Tenant Isolation
1. Open DevTools (F12) → Network tab
2. Navigate to `/dashboard/analytics`
3. Watch the API calls to `/api/analytics/*`
4. Verify they return data for YOUR tenant only

### 4. Test Sign Out & Sign In
1. Sign out from the dashboard (user menu)
2. Navigate to `http://localhost:3000/sign-in`
3. Enter your credentials
4. You should be redirected to `/dashboard` (skipping onboarding since you already have a tenant)

### 5. Test Protected Routes
1. Sign out
2. Try to navigate to `http://localhost:3000/dashboard`
3. You should be redirected to `/sign-in`
4. Try to navigate to `http://localhost:3000/pos`
5. You should be redirected to `/sign-in`

## Expected Behavior

✅ **Working:**
- Sign-up requires email verification
- After verification, redirect to onboarding
- Onboarding creates tenant and assigns to user
- Dashboard loads with user's tenant data
- API routes filter by authenticated user's tenant
- Protected routes redirect to sign-in

❌ **Not Working (Expected):**
- Automated browser testing (requires email verification)
- Direct navigation to `/onboarding` without authentication

## Troubleshooting

### "Unauthorized" on Onboarding
- Make sure you clicked the email verification link from Clerk
- Clear browser cache and try again
- Check that Clerk keys are correct in `.env.local`

### API Returns Empty Data
- Make sure you've created products/orders for your tenant
- Check Network tab for 401/403 errors
- Verify `tenantId` in Clerk user metadata

### Redirect Loop
- Clear browser cookies
- Sign out completely from Clerk
- Try incognito/private browsing mode

## Next Steps

After successful authentication:
1. Create products via `/dashboard/products` (when built)
2. Test POS with your products
3. Invite team members (Owner only)
4. Test role-based permissions
