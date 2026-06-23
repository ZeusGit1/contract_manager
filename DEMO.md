# Contract Manager — Leadership demo walkthrough

A 15–18 minute live walkthrough. Phase 1 prototype, synthetic data. The narrative is *"here's what your spreadsheet looks like as a real tool"* — not *"here is production software ready to deploy."*

---

## Before the meeting (5 minutes)

1. Double-click **`demo-start.cmd`** in this folder.
2. Wait for the launcher to say **Web ready** — only then is the app actually up. The browser will open on its own.
3. Open a second browser tab to **`http://localhost:5000/swagger`**. Keep it tucked away in case anyone asks _"where does the data really live?"_.
4. Hard-reload the dashboard (Ctrl+F5) once so any cached state is fresh.

If the launcher errors, see **If something breaks** at the bottom of this file.

---

## The three things to land

1. **Parallel review lanes.** InfoSec, Privacy, GCO, and Legal review at the same time — not in a sequential queue. Procurement records the outcomes from the Tuesday/Thursday risk-review calls.
2. **Next-action focus.** The dashboard surfaces what needs work _today_, not contracts that expire someday.
3. **Vendor intelligence persists.** Preferred / Standard / Difficult / Blacklisted captures relationship knowledge that today only lives in Lisa's head.

Everything else in the demo serves one of those three points.

---

## The walkthrough

### 1. Dashboard — 3 minutes

You land here.

- **The seven tiles.** Only the three colored ones (red / orange / gold) demand action. The neutral ones are filters — _"where are things stuck?"_ **Click Overdue items.** The table narrows.
- Click **Active contracts** to clear the filter. **Point at the lane pills in the last column.** Every active contract is mid-review in *multiple* lanes at once. _"This is what 'parallel review' looks like at a glance — InfoSec, Privacy, Legal all in flight on the same contract."_
- **Click the Next due header.** The table re-sorts. _"Lisa starts her day with this view, not 'sort by expiration'."_

> Skip: search box, the procurement-owner column.

### 2. Contract detail — 5 minutes

Click into **"Relativity One — eDiscovery platform renewal"** (or any IT contract with a big value). This is the demo's anchor.

- **Header bar.** Vendor, value, "In review · N lanes." _"At a glance, where this contract is."_
- **Review lanes.** Click **Show N other lanes** to expand the full set. Each lane has its own status, owner, due date — independent of every other lane. _"No serial workflow. No reviewer waiting on another reviewer."_
- **Approvals panel** (between Review lanes and the tabs). Four lanes: Legal, InfoSec, Privacy, GCO. _"This is what the Tuesday risk-review call produces. Each one is a verbal yes-or-no in real life. Procurement records it here."_ Click **Record** on one of them to show the lane editor — close without saving.
- **Right rail** quick walk: Overall status (Active / Completed / Canceled — procurement keeps manual control), Priority, Procurement owner (reassign on the fly), Key facts (vendor, value, contract term).
- **The five tabs** — concrete features land here:
  - **Documents** — drag a file in, or click Upload. Vendor draft, signed copy, anything that belongs to the matter.
  - **Comments** — type a comment, toggle **Internal only**, click **Post comment**. _"Two visible colors — gold border is internal-only, blue border is everyone."_
  - **Notes** — type a note. _"Procurement-private. Never leaves the team. The vendor doesn't see this. The requester doesn't see this."_
  - **Activity** — _"And every comment, note, lane change, and approval lands here as the audit trail."_

> Skip: editing a lane for real. Open the Send-reminder modal if asked, but don't actually send.

### 3. Reports — 2 minutes

Click **Reports** in the sidebar.

- _"This is what Lisa hands her manager at her annual review."_ Point at **Contracts reviewed YTD**.
- _"And this is the pushback-on-rush-requests view."_ Point at **Active right now**.
- The two bar charts show load by category and by procurement owner. _"The team can see who's drowning."_

### 4. Vendors — 2 minutes

Click **Vendors** in the sidebar.

- _"Today the knowledge that this vendor is difficult lives in Lisa's head. Here it lives in the system."_
- Change the status filter to **Difficult**. _"These are the ones that need extra attention at intake."_
- Click any vendor to open the detail modal. Point at the **status dropdown** — _"Procurement updates this as the relationship evolves."_ Close.
- Click **Add vendor** at the top right. Fill in a sample: `Acme Demo Co`, Software, Standard. **Click Add vendor.** It persists — this is a live API call, the row will appear in the list.

### 5. New contract submission — 3 minutes

Click **New contract** at the top right of the dashboard.

- **Pick a category.** Event is the lightest form, IT is the fullest. Pick whichever fits the audience.
- **Fill in the basics:** title, vendor (autocomplete), total cost, term dates.
- For IT, walk past the IT-specific fields to the four **risk-review toggles** at the bottom (Personal data / PHI / Client matter / Uses AI). _"These four answers determine the review path."_ Toggle one — watch the **Routing preview** at the bottom update.
- **Click Submit for review.** You land on the dashboard with a **green Contract submitted banner** carrying the new contract number.

If anyone asks _"where did that go?"_ — flip to the Swagger tab, expand **`Contracts → GET /api/contracts`**, click **Try it out**, set `sortBy=submittedAt`, `sortDir=desc`, click **Execute**. The new contract is at the top of the response list. _"Real API, real database — the front-end is just a face."_

> Don't click into the newly-submitted contract from the green banner. The detail screen in this prototype only knows about the seed data, so a fresh contract would show "Not found." This is a Phase-2 wire-up, not a real defect.

---

## Things to skip

- **Renewals** in the sidebar — it's a Coming-soon stub by design (Phase 2). Don't click it unless someone asks.
- **Bulk upload** — the drag-and-drop works, but the file-picker takes the demo into Excel territory. Skip unless someone asks.
- **My submissions / My reviews / Archive** — same sortable-table story as the dashboard. Filler at best.
- Manually typing a `/contracts/<number>` URL for any contract you just created — see warning above.

---

## Questions you might get

| Question | Short answer |
|---|---|
| When can this go live? | Working prototype on synthetic data. Hardening (firm auth, observability, real-data import) is the next phase. |
| Where does the data live? | Local SQL Server today; Azure SQL in the firm's tenant when it ships. |
| What about security review? | Built on the firm's Tier 1 framework: Entra ID auth, role-based authorization, audit columns on every row, structured logging, secrets in Key Vault. |
| Does this replace SpendConnect? | No. SpendConnect is the system of record for *spend*. This is the system of record for *review process*. |
| Why build vs buy? | Off-the-shelf tools are sequential workflow engines. The firm's risk review is **parallel** — every reviewer at once, procurement recording verbal outcomes. No commercial tool matches that shape. |
| What does parallel review actually save? | It removes the queue between InfoSec → Privacy → GCO → Legal. The median review time drops by however long the longest single review takes minus however long the parallel batch takes. |
| Who's the user? | Procurement team primarily. Requesters submit via the intake form. Reviewers see only their assigned contracts. |

---

## If something breaks mid-demo

| Symptom | What to do |
|---|---|
| Dashboard is blank or stale | Hard-reload the tab (Ctrl+F5). |
| Submit gets a 400 / network error | Check the **Contract Manager API** PowerShell window — if it's crashed or closed, re-run `demo-start.cmd`. |
| "Contract not found" page | Click the McDermott lockup in the top-left to return to the dashboard. Expected for any contract you just created. |
| Vendors list won't load | The API is down. Re-run `demo-start.cmd`. |
| Everything's wedged | Close both PowerShell windows, re-run `demo-start.cmd`. Full restart is ~20 seconds. |

When you're done: close the two PowerShell windows titled **Contract Manager API** and **Contract Manager Web**.
