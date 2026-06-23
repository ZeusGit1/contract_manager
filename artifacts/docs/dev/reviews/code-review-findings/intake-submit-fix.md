# Code-review findings — fix/intake-submit-fix

## Web layer

Walked `code-review-web.md` against the 4 changed files.

**Findings:** 0 Critical · 0 High · 0 Medium · 0 Low.

Notes:

- The three intake screens now correctly hydrate the API contract: `requesterEmail` is taken from `useCurrentUser()` (`/api/me`), and category-specific fields are nested under `itFields` / `eventFields` / `facilitiesFields` to match `CreateContractRequest`.
- Button styling now follows the design rule (`ux-copy-and-microcopy.md`): ALL CAPS, 5% letter-spacing, 600 weight, sized down by 2pt to accommodate the uppercase setting.
- Submit button is now disabled until `currentUser.data?.email` is available — prevents form submission with an empty required field.

No mechanical fixes required from this layer.
