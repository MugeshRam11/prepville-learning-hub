# Graph Report - C:\Users\Rishi\Music\arun  (2026-08-03)

## Corpus Check
- Large corpus: 530 files · ~521,328 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 388 nodes · 1688 edges · 13 communities (9 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Features
- Adminexamcontrolpanel Features
- Equationeditor Features
- Icon Features
-  Features
- Logo Features
- Progressreports Features
- Multiplechoiceeditor Features
- Exammodecard Features
- Ratio Features
- Xprewardtoast Features
- Logger Features
- D Features

## God Nodes (most connected - your core abstractions)
1. `button` - 187 edges
2. `utils` - 130 edges
3. `badge` - 123 edges
4. `card` - 121 edges
5. `client` - 100 edges
6. `input` - 74 edges
7. `select` - 47 edges
8. `useAuth` - 40 edges
9. `student.routes` - 39 edges
10. `label` - 37 edges

## Surprising Connections (you probably didn't know these)
- `AdminBillingPanel` --references--> `AdSavvy logo(png)`  [EXTRACTED]
  src/components/admin/AdminBillingPanel.tsx → src/assets/AdSavvy logo(png).png
- `Header` --references--> `adsavvy-logo`  [EXTRACTED]
  src/components/Header.tsx → src/assets/adsavvy-logo.svg
- `AvatarCustomizer` --references--> `cool-cat`  [EXTRACTED]
  src/components/student/AvatarCustomizer.tsx → src/assets/avatars/cool-cat.png
- `StudentDashboard` --references--> `cool-cat`  [EXTRACTED]
  src/components/student/StudentDashboard.tsx → src/assets/avatars/cool-cat.png
- `AvatarCustomizer` --references--> `dragon-tamer`  [EXTRACTED]
  src/components/student/AvatarCustomizer.tsx → src/assets/avatars/dragon-tamer.png

## Import Cycles
- None detected.

## Communities (13 total, 4 thin omitted)

### Community 0 - "App Features"
Cohesion: 0.07
Nodes (73): App, cool-cat, dragon-tamer, math-wizard, ocean-explorer, robot-friend, space-explorer, BulkUploadForm (+65 more)

### Community 1 - "Adminexamcontrolpanel Features"
Cohesion: 0.05
Nodes (73): AdminExamControlPanel, EvaluationAnswerRenderer, QuestionTypeConfirmation, SortableStepItem, PuzzleDragDrop, DraggableElementContent, VennDiagram, VennDiagramEditor (+65 more)

### Community 2 - "Equationeditor Features"
Cohesion: 0.07
Nodes (62): EquationEditor, MathGraphTestLoader, MathRichEditor, MockTestWordUpload, RichTextEditor, SampleTestLoader, SymbolPicker, AITestEvaluation (+54 more)

### Community 3 - "Icon Features"
Cohesion: 0.10
Nodes (52): prep-ville-icon, AdminSidebar, AIDocumentProcessingModal, AnswerBlockTypeSelector, BoundingBoxOverlay, CSVImportModal, SectionCard, types (+44 more)

### Community 4 - " Features"
Cohesion: 0.14
Nodes (48): AdSavvy logo(png), AdminBillingPanel, AdminSettings, CommandTermSelector, CreateUserModal, EditUserModal, ImageUpload, ManualQuestionForm (+40 more)

### Community 5 - "Logo Features"
Cohesion: 0.10
Nodes (42): adsavvy-logo, prep-ville-logo, AITutorChat, AuthHeader, CommandTermCard, CommandTermCategory, CommandTermsFilter, CommandTermsHero (+34 more)

### Community 6 - "Progressreports Features"
Cohesion: 0.20
Nodes (15): ProgressReports, ReportCharts, ReportFilters, ReportOverviewCards, UserDetailDrawer, PersonalizedSuggestions, sheet, sidebar (+7 more)

### Community 7 - "Multiplechoiceeditor Features"
Cohesion: 0.31
Nodes (13): MultipleChoiceEditor, TableEditor, BuilderCanvas, BuilderSidebar, index, MediaUploader, ExamBuilder, ExamBuilderHeader (+5 more)

### Community 8 - "Exammodecard Features"
Cohesion: 0.33
Nodes (6): ExamModeCard, InteractiveDemoCard, PuzzleChallengeCard, UnifiedExamCard, interactiveDemoSampleTest, puzzleDragDropSampleTest

## Knowledge Gaps
- **39 isolated node(s):** `sonner`, `AdSavvy logo(png)`, `prep-ville-icon`, `FeaturesSection`, `StatsSection` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `button` connect `Equationeditor Features` to `App Features`, `Adminexamcontrolpanel Features`, `Icon Features`, ` Features`, `Logo Features`, `Progressreports Features`, `Multiplechoiceeditor Features`, `Exammodecard Features`?**
  _High betweenness centrality (0.298) - this node is a cross-community bridge._
- **Why does `utils` connect `Adminexamcontrolpanel Features` to `App Features`, `Equationeditor Features`, `Icon Features`, ` Features`, `Logo Features`, `Progressreports Features`, `Multiplechoiceeditor Features`, `Exammodecard Features`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `card` connect `Equationeditor Features` to `App Features`, `Adminexamcontrolpanel Features`, `Icon Features`, ` Features`, `Logo Features`, `Progressreports Features`, `Exammodecard Features`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **What connects `sonner`, `AdSavvy logo(png)`, `prep-ville-icon` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Features` be split into smaller, more focused modules?**
  _Cohesion score 0.06506849315068493 - nodes in this community are weakly interconnected._
- **Should `Adminexamcontrolpanel Features` be split into smaller, more focused modules?**
  _Cohesion score 0.0502283105022831 - nodes in this community are weakly interconnected._
- **Should `Equationeditor Features` be split into smaller, more focused modules?**
  _Cohesion score 0.0745637228979376 - nodes in this community are weakly interconnected._