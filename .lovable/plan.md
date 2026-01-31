
# Plan: Sync Admin Practice-QA to /practice & Mock Tests to /mock-exams/select with Real-Time Updates

## Problem Summary

Currently:
1. **`/practice`** page shows hardcoded placeholder cards (6 fake "Continue Your Practice" cards) - not synced with admin uploads
2. **`/mock-exams/select`** shows data from `mock_tests` table but groups by subject only - not showing individual tests
3. **Admin `/admin/tests` (Practice-QA)** manages `tests` table with `test_type = 'quick_test'` 
4. **Admin `/admin/mock-tests`** manages `mock_tests` table
5. Both admin panels already have real-time subscriptions for their own data, but user-facing pages need sync

## Data Flow Understanding

| Admin Page | Database Table | User Page | Status |
|------------|----------------|-----------|--------|
| `/admin/tests` (Practice-QA) | `tests` (where test_type='quick_test') + `questions` | `/practice` | Not synced - shows hardcoded data |
| `/admin/mock-tests` | `mock_tests` + `mock_questions` | `/mock-exams/select` | Partially synced (groups by subject only) |

---

## Solution Overview

### Part 1: Sync `/admin/tests` → `/practice`

Fetch from `tests` table (where `test_type = 'quick_test'` AND `is_active = true`) and display as individual practice test cards with real-time updates.

### Part 2: Sync `/admin/mock-tests` → `/mock-exams/select`

Fetch from `mock_tests` table (where `is_published = true`) and display as individual test cards (not grouped by subject) with real-time updates.

### Part 3: Separate Cards by Type

Each test should be displayed as an individual card with its own metadata (title, subject, questions count, etc.)

---

## Phase 1: Update Practice Page (`/practice`)

**File**: `src/pages/Practice.tsx`

### Current State (Wrong)
- Shows 3 static option cards (Quick Practice, Topic Practice, Mock Exams)
- Shows 6 hardcoded fake "Continue Your Practice" cards with placeholder data
- No database connection to `tests` table

### New State (Correct)
- Hero section: "Practice & Learn"
- Fetch from `tests` table: `SELECT * FROM tests WHERE test_type = 'quick_test' AND is_active = true`
- Subscribe to real-time changes on `tests` table
- Display each test as an individual card
- Card shows: title, description, question count, difficulty, "Start Practice" button
- Button navigates to `/practice/exam` with test data

### Database Query
```typescript
const { data, error } = await supabase
  .from('tests')
  .select('*, questions(count)')
  .eq('test_type', 'quick_test')
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

### Real-time Subscription
```typescript
const channel = supabase.channel('practice_tests_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tests',
    filter: 'test_type=eq.quick_test'
  }, () => {
    fetchPracticeTests();
  })
  .subscribe();
```

### Card Design
Each Practice-QA card will display:
- Green "Practice-QA" badge
- Test title
- Description (if available)
- Question count
- Difficulty level badge
- Time estimate
- "Start Practice" button → navigates to `/practice/exam`

---

## Phase 2: Update Mock Exams Select Page (`/mock-exams/select`)

**File**: `src/pages/MockExamSelect.tsx`

### Current State
- Fetches from `mock_tests` table
- Aggregates by subject (groups tests)
- Shows subject cards like "Mathematics", "Physics" etc.
- Already has real-time subscription

### New State
- Remove subject aggregation
- Display each mock test as an individual card
- Show: title, topic, subject badge, question count, "Start Exam" button
- Keep real-time subscription (already exists)

### Database Query (Updated)
```typescript
const { data, error } = await supabase
  .from('mock_tests')
  .select('*')
  .eq('is_published', true)
  .order('subject', { ascending: true })
  .order('created_at', { ascending: false });
```

### Card Design
Each Mock Test card will display:
- Subject badge (e.g., "MYP Mathematics")
- Test title
- Topic
- Question count
- Published status indicator
- "Start Exam" button → navigates to `/mock-exams/unified`

---

## Phase 3: Create Reusable Test Card Components

### New Component: `PracticeTestCard.tsx`
**File**: `src/components/practice/PracticeTestCard.tsx`

```typescript
interface PracticeTestCardProps {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  difficulty: string;
  timeLimitMinutes: number;
  onStart: (testId: string) => void;
}
```

Features:
- Green border/accent for practice mode
- "Practice-QA" badge
- Difficulty indicator
- No timer pressure language

### New Component: `MockTestCard.tsx`
**File**: `src/components/mock-exam/MockTestCard.tsx`

```typescript
interface MockTestCardProps {
  id: string;
  title: string;
  subject: string;
  topic: string;
  totalQuestions: number;
  timeLimitMinutes?: number;
  onStart: (testId: string, questions: any[]) => void;
}
```

Features:
- Blue/primary accent for exam mode
- Subject badge with color coding
- "Start Exam" button

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/practice/PracticeTestCard.tsx` | Individual practice test card component |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Practice.tsx` | Complete overhaul - fetch from `tests` table, real-time sync, show individual cards |
| `src/pages/MockExamSelect.tsx` | Update to show individual mock tests instead of subject groups |
| `src/components/mock-exam/MockTestCard.tsx` | Already exists - may need minor updates |

---

## Technical Implementation Details

### Practice.tsx - New Structure

```tsx
const Practice = () => {
  const navigate = useNavigate();
  const [practiceTests, setPracticeTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPracticeTests();

    // Real-time subscription
    const channel = supabase.channel('practice_tests_sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tests'
      }, () => {
        fetchPracticeTests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPracticeTests = async () => {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('test_type', 'quick_test')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setPracticeTests(data || []);
    }
    setLoading(false);
  };

  const handleStartPractice = async (testId: string) => {
    // Fetch questions for this test
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId);

    navigate('/practice/exam', {
      state: {
        testId,
        questions,
        title: test.title
      }
    });
  };

  return (
    <div>
      <Header />
      {/* Hero */}
      <section className="py-12 bg-gradient-to-br from-green-50 to-emerald-50">
        <h1>Practice & Learn</h1>
        <p>No timer, no pressure. Learn at your own pace.</p>
      </section>

      {/* Practice Test Cards */}
      <section className="py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {practiceTests.map(test => (
            <PracticeTestCard
              key={test.id}
              id={test.id}
              title={test.title}
              description={test.description}
              totalQuestions={test.total_questions}
              difficulty={test.difficulty_level}
              timeLimitMinutes={test.time_limit_minutes}
              onStart={handleStartPractice}
            />
          ))}
        </div>
      </section>

      {/* Link to Mock Exams */}
      <section>
        <Button onClick={() => navigate('/mock-exams/select')}>
          Take Mock Exam
        </Button>
      </section>
      <Footer />
    </div>
  );
};
```

### MockExamSelect.tsx - Updated Structure

```tsx
const MockExamSelect = () => {
  const [mockTests, setMockTests] = useState([]);
  
  useEffect(() => {
    fetchMockTests();

    // Real-time subscription (already exists, keep it)
    const channel = supabase.channel('mock_tests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mock_tests'
      }, () => {
        fetchMockTests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMockTests = async () => {
    // Fetch individual tests, not grouped by subject
    const { data, error } = await supabase
      .from('mock_tests')
      .select('*')
      .eq('is_published', true)
      .order('subject')
      .order('created_at', { ascending: false });

    if (!error) {
      setMockTests(data || []);
    }
  };

  const handleStartExam = async (testId: string) => {
    const { data: questions } = await supabase
      .from('mock_questions')
      .select('*, mock_sub_questions(*)')
      .eq('mock_test_id', testId)
      .order('question_number');

    navigate('/mock-exams/unified', {
      state: {
        testId,
        questions,
        ...testMetadata
      }
    });
  };

  return (
    <div>
      {/* Display individual mock test cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTests.map(test => (
          <MockTestCard
            key={test.id}
            id={test.id}
            title={test.title}
            subject={test.subject}
            topic={test.topic}
            totalQuestions={test.total_questions}
            onStart={handleStartExam}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## Visual Result Summary

### `/practice` (After)
```text
+--------------------------------------------------+
|            Practice & Learn                       |
|  No timer, no pressure. Learn at your own pace.  |
+--------------------------------------------------+
|                                                   |
|  +----------+  +----------+  +----------+         |
|  | Practice |  | Practice |  | Practice |         |
|  | QA       |  | QA       |  | QA       |         |
|  | Title 1  |  | Title 2  |  | Title 3  |         |
|  | 20 Qs    |  | 15 Qs    |  | 25 Qs    |         |
|  | Easy     |  | Medium   |  | Hard     |         |
|  | [Start]  |  | [Start]  |  | [Start]  |         |
|  +----------+  +----------+  +----------+         |
|                                                   |
|  [Take Mock Exam →] /mock-exams/select            |
+--------------------------------------------------+
```

### `/mock-exams/select` (After)
```text
+--------------------------------------------------+
|           Mock Examinations                       |
|  Timed exam simulations under real conditions    |
+--------------------------------------------------+
|                                                   |
|  +----------+  +----------+  +----------+         |
|  | MYP Math |  | MYP Phys |  | MYP Chem |         |
|  | Algebra  |  | Mechanics|  | Organic  |         |
|  | 48 Qs    |  | 35 Qs    |  | 40 Qs    |         |
|  | [Start]  |  | [Start]  |  | [Start]  |         |
|  +----------+  +----------+  +----------+         |
|                                                   |
+--------------------------------------------------+
```

---

## Real-Time Sync Behavior

When admin publishes/updates a test:

1. **Admin action**: Toggle `is_active` (Practice-QA) or `is_published` (Mock Tests)
2. **Supabase Realtime**: Broadcasts `postgres_changes` event
3. **User page**: Subscription callback triggers `fetchTests()`
4. **UI updates**: Card appears/disappears instantly (< 1 second)

---

## Testing Checklist

After implementation:

1. **Practice Real-time Test**
   - Admin: Create Practice-QA test and activate it
   - User: `/practice` should show new card within 1 second
   - Admin: Deactivate test
   - User: Card disappears instantly

2. **Mock Exam Real-time Test**
   - Admin: Create Mock Test and publish it
   - User: `/mock-exams/select` should show new card
   - Admin: Unpublish test
   - User: Card disappears

3. **Individual Card Test**
   - Each test is shown as separate card (no grouping)
   - Card displays correct: title, questions count, difficulty
   - Click "Start" → navigates to correct exam page with questions loaded

4. **No Duplicates**
   - Remove hardcoded placeholder cards
   - Only database-synced cards shown

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/practice/PracticeTestCard.tsx` |
| Rewrite | `src/pages/Practice.tsx` |
| Modify | `src/pages/MockExamSelect.tsx` |
