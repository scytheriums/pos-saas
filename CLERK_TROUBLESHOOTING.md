# Clerk 401 Error - Troubleshooting Guide

## Problem
You're seeing **401 Unauthorized** errors in the browser console when trying to connect to Clerk:
```
Failed to load resource: the server responded with a status of 401 ()
- /v1/client
- /v1/environment
```

## Solutions

### Solution 1: Verify API Keys (Most Common)

1. **Check your Clerk Dashboard:**
   - Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
   - Select your application
   - Go to **API Keys** in the sidebar
   - Make sure you're copying from the correct application

2. **Check your `.env.local` file:**
   - Open `.env.local` in the root directory
   - Verify the keys match EXACTLY (no extra spaces, quotes, or line breaks)
   - Format should be:
     ```env
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
     CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
     ```

3. **Common mistakes:**
   - ❌ Extra quotes: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"`
   - ❌ Extra spaces: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= pk_test_xxx`
   - ❌ Wrong key type: Using production keys (`pk_live_`) in development
   - ✅ Correct: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx`

### Solution 2: Restart the Development Server

**CRITICAL:** Next.js only loads `.env.local` on startup!

1. **Stop the current server:**
   - Press `Ctrl+C` in the terminal running `npm run dev`
   - Or close the terminal

2. **Start it again:**
   ```bash
   npm run dev
   ```

3. **Wait for it to fully compile** before refreshing the browser

### Solution 3: Clear Browser Cache

Sometimes the browser caches the old configuration:

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Solution 4: Check Environment Variable Loading

Create a test page to verify the keys are loaded:

**Create `src/app/test-env/page.tsx`:**
```tsx
export default function TestEnvPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  return (
    <div className="p-8">
      <h1>Environment Test</h1>
      <p>Publishable Key: {publishableKey ? '✅ Loaded' : '❌ Missing'}</p>
      <p>First 20 chars: {publishableKey?.substring(0, 20)}...</p>
    </div>
  );
}
```

Navigate to `http://localhost:3000/test-env` to verify.

### Solution 5: Verify Clerk Application Status

1. Go to your Clerk Dashboard
2. Check if your application is **Active** (not paused or deleted)
3. Verify you're using the correct environment (Development vs Production)

## Quick Checklist

- [ ] API keys copied correctly from Clerk dashboard
- [ ] No extra spaces or quotes in `.env.local`
- [ ] Using `pk_test_` and `sk_test_` (not production keys)
- [ ] Dev server restarted after adding keys
- [ ] Browser cache cleared
- [ ] Clerk application is active

## Still Not Working?

If you've tried all the above:

1. **Delete `.env.local` and recreate it** - sometimes file encoding issues occur
2. **Create a new Clerk application** - the current one might have issues
3. **Check Clerk status** - Visit [status.clerk.com](https://status.clerk.com)

## Need Help?

Share:
1. First 20 characters of your publishable key (e.g., `pk_test_bWF0Y2hpbmc...`)
2. The exact error message from browser console
3. Whether the dev server was restarted
