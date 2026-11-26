# Mock and Practice question parity

| Capability | Mock | Independent Practice | Evidence / boundary |
|---|---|---|---|
| Stem and part diagrams | Shared uploader in QuestionGroupCard and SubQuestionCard | Shared uploader in QuestionBankManager; one-part groups display in PracticeSessionWorkspace | Hosted API rehearsal uploaded a PNG, denied a disguised file, withheld draft access and signed a published reference. |
| Text and LaTeX | Existing Mock block configuration | UnifiedMathEditor and existing canonical parser | Local equation regression suite. |
| Part marks and protected keys | Existing Mock prompt RPC strips marking data | Per-part marks, isolated keys and immutable session prompt | Local SQL regression and hosted authenticated reads. |
| Revisions and archival | Existing Mock attempt model | Stable object path captured in session JSON | Hosted rehearsal signed an archived diagram for its session owner and denied a different student. |
| Short answer / text equation | Supported | Pass for supported input and submission | Local paper and single-question browser journey. |
| Working box | Existing response block | Pass for saving working and manual-review contract | Local database evaluation suite. |
| Text multiple choice | Existing response block | Pass for supported option IDs, keys and scalar selection contract | Database and schema tests. Browser acceptance of every variant is outstanding. |
| Image-choice answers, graph plotting, drag/drop, image drop, image fill blanks, ordering, Venn and table input | Existing Mock block families | Blocked in Practice | Practice authoring only accepts its four supported answer types. Rich Mock interactions need individual regression sign-off. |

One diagram can be attached to each stem and each part. Alt text, intrinsic dimensions and kind accompany uploaded references in the URL fragment. The stored path remains stable across signing. A blank description uses the question or part label unless the author explicitly saves an empty alt value. CSV supports an optional `image_url` for a single prompt.

New uploads use the private `practice-diagrams` bucket. Staff upload through the validated Edge Function. Historical public URLs may remain externally accessible and require an owner-reviewed inventory. Clearing a reference retains the object for previous sessions. New bank uploads are eligible for cleanup after seven days only if never attached. The worker claims rows under lock and retries failed Storage removal. Historical objects are outside its scope.

Implementation: [uploader](src/components/admin/QuestionMediaUploader.tsx), [diagram renderer](src/components/QuestionDiagram.tsx), [file signature checks](supabase/functions/_shared/diagram.ts), [storage policies](supabase/migrations/20261126000100_diagram_storage.sql), [Mock access](supabase/migrations/20261126000800_mock_diagram_access.sql), [hosted test](scripts/rehearse-student-staging.mjs).
