# Code-Review Findings — bulk-upload vendor resolution

## Web layer

| File | Category | Severity | Fix class | Rule | Proposed fix |
|---|---|---|---|---|---|
| web/src/features/bulk-upload/AddVendorInline.tsx | Form autocomplete attributes | Low | Architectural | web-coding-standards.md ("Use `autocomplete` attributes") | The vendor-name/contact fields describe *another* entity, not the user's own PII, so autofill isn't a natural fit. Existing `AddVendorModal` in VendorMasterScreen omits them too — codebase-consistent. Recommend adding `autocomplete="organization"` on the vendor-name field only if password managers become disruptive; otherwise leave. |
| web/src/features/bulk-upload/VendorPickerCell.tsx | Inline `useQuery` inside a UI component | Low | Architectural | code-review-web.md#architecture-violations | The intake screens (IntakeITScreen, IntakeEventScreen, IntakeFacilitiesScreen) already inline this exact same autocomplete `useQuery`. Extract to a `useVendorAutocomplete(query)` custom hook if a fifth call site appears. |
| web/src/features/bulk-upload/VendorPickerCell.tsx, AddVendorInline.tsx | No component-level `.test.tsx` shipped | Medium | Architectural | web-testing.md — "Every component test for a form-bearing or interactive component must include an axe assertion" | Repo pattern: no intake/vendor UI has component tests today (only pure helpers, primitives, and one feature-level test). The core resolution logic (helpers) is covered by 6 unit tests. Add component tests when MSW is introduced project-wide. |

**No Critical or High findings.**
