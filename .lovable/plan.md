
# Authentication Fix Plan - Enable Demo Mode to Work End-to-End

## Problem Summary
The current authentication flow has a critical disconnect between the **offline demo mode** and the **Supabase-based auth system**:

1. **Demo Button Creates Local Session** - The `DemoUserButton` stores a mock session in `localStorage`, but...
2. **Auth Hook Ignores Demo Session** - The `useAuth` hook only listens to Supabase's `onAuthStateChange`, which never fires for demo users
3. **Protected Routes Block Access** - Since `user` is always `null` for demo sessions, `ProtectedRoute` redirects to `/auth`
4. **Subscription Check Fails** - The RPC `get_user_subscription_status` receives an invalid UUID for demo users

The result: clicking "Try Demo Account" creates a localStorage session but immediately gets redirected back to login.

---

## Solution Overview

Update the authentication system to recognize demo sessions as valid, falling back to the localStorage mock session when no Supabase session exists.

---

## Phase 1: Update useAuth Hook to Support Demo Sessions

**File: `src/hooks/useAuth.tsx`**

**Changes:**
- Import demo session utilities from `authService.ts`
- Check for demo session during initial load and when Supabase session is null
- Create a mock User object from the demo session
- Add `isDemo` flag to context to identify demo users
- Handle sign out to also clear demo session

**Key Code Changes:**
```text
Lines 1-5: Add imports for isDemoSession, getDemoSession, clearDemoSession
Lines 16-19: Add isDemo state variable
Lines 38-50: After getSession(), check for demo session as fallback
Lines 95-97: Update signOut to also call clearDemoSession()
Lines 100-110: Add isDemo to context provider value
```

---

## Phase 2: Update ProtectedRoute for Demo Compatibility

**File: `src/components/ProtectedRoute.tsx`**

**Changes:**
- Import `isDemoSession` check
- Allow access when user is null but demo session is active
- Pass demo flag to child components if needed

**Key Code Changes:**
```text
Lines 2-3: Add import for isDemoSession
Lines 27-29: Modify redirect condition to allow demo sessions
```

---

## Phase 3: Update useSubscription for Demo Users

**File: `src/hooks/useSubscription.tsx`**

**Changes:**
- Import demo session utilities
- Skip RPC call for demo users
- Return mock "active" subscription for demo sessions
- Ensure `hasAccess` is true for demo users

**Key Code Changes:**
```text
Lines 2-3: Add imports for isDemoSession
Lines 27-35: Check if demo session, return mock subscription
Lines 66-67: Update hasAccess to include demo check
```

---

## Phase 4: Fix DemoUserButton Navigation

**File: `src/components/auth/DemoUserButton.tsx`**

**Changes:**
- Use React Router's `navigate()` instead of `window.location.href`
- Add small delay to allow state to propagate
- Trigger a manual page refresh or force re-render

**Key Code Changes:**
```text
Lines 31-32: Replace window.location.href with navigate('/dashboard')
Add: Small timeout to allow localStorage to be read by providers
```

---

## Phase 5: Update Auth Page to Check Demo Session

**File: `src/pages/Auth.tsx`**

**Changes:**
- Import demo session check
- Redirect to dashboard if demo session is active
- Prevent logged-in demo users from seeing auth page

**Key Code Changes:**
```text
Lines 17-21: Check for demo session in useEffect and redirect
```

---

## Implementation Details

### Updated useAuth Hook Structure
```text
┌─────────────────────────────────────────────────────┐
│                    useAuth Hook                     │
├─────────────────────────────────────────────────────┤
│  State:                                             │
│  - user: User | null (Supabase OR demo)            │
│  - session: Session | null (Supabase OR demo)      │
│  - isDemo: boolean                                  │
│  - loading: boolean                                 │
├─────────────────────────────────────────────────────┤
│  Flow:                                              │
│  1. Check Supabase session                          │
│  2. If null, check localStorage for demo session    │
│  3. If demo exists, create mock User object         │
│  4. Set isDemo = true                               │
│  5. Proceed with authenticated state                │
└─────────────────────────────────────────────────────┘
```

### Mock User Object for Demo
```typescript
{
  id: 'demo-user-offline-id-12345',
  email: 'demo@studyhub.com',
  user_metadata: {
    full_name: 'Demo User',
    role: 'student',
    is_demo: true
  }
}
```

### Mock Subscription for Demo
```typescript
{
  status: 'active',
  isTrialActive: false,
  isSubscriptionActive: true,
  daysLeft: 999,
  planName: 'Demo Access'
}
```

---

## Files to Modify

| File | Change Type | Purpose |
|------|-------------|---------|
| `src/hooks/useAuth.tsx` | Major | Add demo session fallback |
| `src/components/ProtectedRoute.tsx` | Minor | Allow demo users through |
| `src/hooks/useSubscription.tsx` | Minor | Mock subscription for demo |
| `src/components/auth/DemoUserButton.tsx` | Minor | Fix navigation method |
| `src/pages/Auth.tsx` | Minor | Redirect if demo active |

---

## Testing Plan

After implementation, the following flow should work:
1. Visit `/auth` page
2. Click "Try Demo Account"
3. Automatically redirected to `/dashboard`
4. Student dashboard loads with demo user data
5. Navigate to `/mock-exams/select` without redirect
6. Start an exam, answer questions
7. Use AI feedback in study mode
8. Submit exam and see results

---

## Technical Notes

**Security:**
- Demo mode is intentionally client-side only - no server-side privileges
- Demo user cannot access real database records (RLS policies still apply)
- Demo answers are saved to localStorage only, not database

**Limitations:**
- Demo user data won't persist across browsers
- Real exam submissions require actual Supabase authentication
- Leaderboard and social features disabled for demo users
