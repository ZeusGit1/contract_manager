# Remediations Applied — bulk-upload vendor resolution

| File | Issue | Severity | Source | Fix | Status |
|---|---|---|---|---|---|
| web/src/features/bulk-upload/VendorPickerCell.tsx:44 | `setState` inside `useEffect` (react-hooks/set-state-in-effect) | Medium | code-review-web / lint | Lifted `draft` state to parent (BulkUploadScreen already owns it for other cells); useEffect now only focuses/selects the input | Applied |
| web/src/features/bulk-upload/AddVendorInline.tsx:46 | `setState` inside `useEffect` (react-hooks/set-state-in-effect) | Medium | code-review-web / lint | Removed the sync effect — modal is unmounted on close, so `useState(initialName)` seeds correctly and the parent never mutates `initialName` while mounted | Applied |
| web/src/features/bulk-upload/BulkUploadScreen.tsx (formatting) | Prettier drift | Low | web-linting-formatting.md | `npx prettier --write` on touched files | Applied |
| web/src/features/bulk-upload/BulkUploadScreen.module.css (formatting) | Prettier drift | Low | web-linting-formatting.md | `npx prettier --write` on touched files | Applied |
