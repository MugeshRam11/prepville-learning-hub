

# Plan: Rename "Quick Test" to "Practice-QA" in Admin Panel

## Problem Summary

The admin sidebar and `/admin/tests` page currently use the label **"Quick Test"** which:
- Sounds like an exam/assessment
- Is actually used for practice/learning questions
- Creates confusion about the purpose of uploaded questions

## Scope (Strict)

**ONLY** rename the label from "Quick Test" to "Practice-QA"

| Change Type | Allowed? |
|-------------|----------|
| Tab/label text rename | Yes |
| New links | No |
| Routing changes | No |
| Backend logic | No |
| Other tab changes | No |

---

## Files to Modify

### 1. AdminSidebar.tsx - Sidebar Navigation Label

**File**: `src/components/admin/AdminSidebar.tsx`

**Line 47 - Current**:
```tsx
{ id: 'tests', label: 'Quick Test', icon: FileText, path: '/admin/tests' },
```

**Change to**:
```tsx
{ id: 'tests', label: 'Practice-QA', icon: FileText, path: '/admin/tests' },
```

---

### 2. AdminTests.tsx - Page Header and Text

**File**: `src/pages/AdminTests.tsx`

**Line 171 - Page Title**:
```tsx
<h1 className="text-3xl font-bold text-gray-900">Quick Tests Management</h1>
```
**Change to**:
```tsx
<h1 className="text-3xl font-bold text-gray-900">Practice-QA Management</h1>
```

**Line 172 - Subtitle**:
```tsx
<p className="text-gray-600 mt-1">Create and manage quick practice tests</p>
```
**Change to**:
```tsx
<p className="text-gray-600 mt-1">Create and manage practice questions</p>
```

**Line 294-295 - Badge in test cards**:
```tsx
<Badge variant="secondary" className="text-xs font-medium bg-pink-100 text-pink-700">
  Quick Test
</Badge>
```
**Change to**:
```tsx
<Badge variant="secondary" className="text-xs font-medium bg-green-100 text-green-700">
  Practice-QA
</Badge>
```

---

### 3. TestManagement.tsx - Component Labels (if used)

**File**: `src/components/admin/TestManagement.tsx`

**Line 168 - Title**:
```tsx
<h1 className="text-3xl font-bold text-gray-900">Quick Test Management</h1>
```
**Change to**:
```tsx
<h1 className="text-3xl font-bold text-gray-900">Practice-QA Management</h1>
```

**Line 169 - Subtitle**:
```tsx
<p className="text-gray-600">Create and manage quick tests</p>
```
**Change to**:
```tsx
<p className="text-gray-600">Create and manage practice questions</p>
```

**Line 178 - Upload button text**:
```tsx
Upload Quick Test (Word)
```
**Change to**:
```tsx
Upload Practice-QA (Word)
```

**Line 195 - Search placeholder**:
```tsx
placeholder="Search quick tests..."
```
**Change to**:
```tsx
placeholder="Search practice questions..."
```

---

## Summary of All Text Changes

| Location | Current Text | New Text |
|----------|--------------|----------|
| AdminSidebar menu | "Quick Test" | "Practice-QA" |
| AdminTests page title | "Quick Tests Management" | "Practice-QA Management" |
| AdminTests subtitle | "Create and manage quick practice tests" | "Create and manage practice questions" |
| AdminTests badge | "Quick Test" (pink) | "Practice-QA" (green) |
| TestManagement title | "Quick Test Management" | "Practice-QA Management" |
| TestManagement subtitle | "Create and manage quick tests" | "Create and manage practice questions" |
| TestManagement upload btn | "Upload Quick Test (Word)" | "Upload Practice-QA (Word)" |
| TestManagement search | "Search quick tests..." | "Search practice questions..." |

---

## Visual Result After Change

**Admin Sidebar**:
```text
/admin
   ├── Dashboard
   ├── User Management
   ├── Practice-QA        ← (renamed from Quick Test)
   ├── Mock Tests
   ├── Question Generator
   └── ...
```

**Admin Tests Page Header**:
```text
Practice-QA Management
Create and manage practice questions
```

---

## Files Unchanged

| File | Reason |
|------|--------|
| `src/App.tsx` | No route changes |
| Backend/Supabase | No schema changes |
| Other admin pages | Not in scope |

---

## Testing Checklist

After implementation:

1. Navigate to `/admin` → Sidebar shows "Practice-QA" label
2. Click "Practice-QA" → Goes to `/admin/tests`
3. Page shows "Practice-QA Management" title
4. Test cards show green "Practice-QA" badge
5. Search placeholder says "Search practice questions..."
6. No other admin tabs affected

