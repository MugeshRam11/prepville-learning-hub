

# Plan: Group Mock Tests by Subject (One Card Per Subject)

## Problem

Currently `/mock-exams/select` displays:
- **Individual test cards** - Each test is a separate card
- If you have 3 Mathematics tests, you see 3 separate cards

## What You Want

- **One card per subject** - Group all tests under their subject
- Shows: Subject name, total questions across all tests, test count
- Clicking "Start Test" navigates to a subject view where user can pick specific test

---

## Current Flow (Wrong)
```text
+------------------+  +------------------+  +------------------+
| MYP Mathematics  |  | MYP Mathematics  |  | MYP Physics      |
| Algebra Test 1   |  | Geometry Test    |  | Mechanics        |
| 20 Questions     |  | 15 Questions     |  | 25 Questions     |
| [Start]          |  | [Start]          |  | [Start]          |
+------------------+  +------------------+  +------------------+
```

## New Flow (Grouped by Subject)
```text
+------------------+  +------------------+  +------------------+
| Mathematics      |  | Physics          |  | Chemistry        |
| Math Topics      |  | Physics Topics   |  | Chemistry Topics |
| 35 Questions     |  | 25 Questions     |  | 40 Questions     |
| [Start Test]     |  | [Start Test]     |  | [Start Test]     |
+------------------+  +------------------+  +------------------+
```

---

## Technical Implementation

### File to Modify: `src/pages/MockExamSelect.tsx`

### Changes Required:

1. **Add Subject Aggregation Logic**
   
   Group tests by subject and calculate totals:
   ```typescript
   interface SubjectGroup {
     subject: string;
     subjectKey: string;
     totalQuestions: number;
     totalTests: number;
     tests: MockTest[];
   }

   const groupedBySubject = useMemo(() => {
     const groups: Record<string, SubjectGroup> = {};
     
     filteredTests.forEach(test => {
       if (!groups[test.subject]) {
         groups[test.subject] = {
           subject: getSubjectLabel(test.subject),
           subjectKey: test.subject,
           totalQuestions: 0,
           totalTests: 0,
           tests: []
         };
       }
       groups[test.subject].totalQuestions += test.total_questions || 0;
       groups[test.subject].totalTests += 1;
       groups[test.subject].tests.push(test);
     });
     
     return Object.values(groups);
   }, [filteredTests]);
   ```

2. **Replace MockTestCard with SubjectTestCard**
   
   Change import:
   ```typescript
   import SubjectTestCard from '@/components/mock-exam/SubjectTestCard';
   ```

3. **Update Card Rendering**
   
   Replace individual test cards with grouped subject cards:
   ```tsx
   {groupedBySubject.map((group, index) => (
     <motion.div key={group.subjectKey} ...>
       <SubjectTestCard
         subject={group.subject}
         subjectKey={group.subjectKey}
         totalQuestions={group.totalQuestions}
         totalTests={group.totalTests}
         onStart={handleStartSubject}
       />
     </motion.div>
   ))}
   ```

4. **Update Start Handler**
   
   Navigate to subject view instead of directly to exam:
   ```typescript
   const handleStartSubject = (subjectKey: string) => {
     navigate(`/mock-exams/subject/${subjectKey}`);
   };
   ```

---

## User Flow After Change

1. User visits `/mock-exams/select`
2. Sees **one card per subject** (Mathematics, Physics, etc.)
3. Clicks "Start Test" on a subject
4. Navigates to `/mock-exams/subject/:subjectKey` → Lists all tests for that subject
5. User picks specific test → Navigates to unified exam

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/MockExamSelect.tsx` | Modify | Add grouping logic, use SubjectTestCard |
| `src/components/mock-exam/SubjectTestCard.tsx` | Keep | Already exists, may need minor update |

---

## Visual Result

### `/mock-exams/select` After Change
```text
+--------------------------------------------------+
|           Mock Examinations                       |
|  Timed exam simulations under real conditions    |
+--------------------------------------------------+
|  [Search...]                [All Subjects v]     |
+--------------------------------------------------+
|                                                   |
|  +----------------+  +----------------+           |
|  | Mathematics    |  | Physics        |           |
|  | Math Topics    |  | Physics Topics |           |
|  | 35 Questions   |  | 25 Questions   |           |
|  | 2 Tests        |  | 1 Test         |           |
|  | [Start Test]   |  | [Start Test]   |           |
|  +----------------+  +----------------+           |
|                                                   |
+--------------------------------------------------+
```

---

## Real-Time Sync

- Keep existing real-time subscription
- When admin publishes/unpublishes a test, the grouped totals update automatically

