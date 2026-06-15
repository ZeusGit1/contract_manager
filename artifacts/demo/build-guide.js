const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType,
  LevelFormat, HeadingLevel, BorderStyle, PageNumber, ShadingType,
} = require('docx');

/* ============================================================================
   McDermott Design System tokens — applied to a Word document
   ============================================================================
   Display headings use Mix (Georgia, the firm's serif).
   Body / UI uses Sans (Arial — the firm's document standard).
   Color hierarchy: navy primary, navy-65% secondary, blue accent.
   Notes use the pale-blue + navy alert pattern from the design system.
   ============================================================================ */
const MIX = 'Georgia';
const SANS = 'Arial';

const COLOR = {
  navy: '000042',          // --color-navy / --text-primary
  navy65: '595984',        // approximates navy at 65% (--text-secondary)
  blue: '0018F2',          // --accent-interactive
  paleBlue: 'E2E8FF',      // --color-pale-blue (alert + callout fills)
  border: 'E5E5EE',        // --border-light
};

// Sizing helpers (docx uses half-points; multiply pt by 2)
const SIZE = {
  display: 56,    // 28pt — page title
  eyebrow: 18,    // 9pt
  subtitle: 28,   // 14pt
  h1: 36,         // 18pt
  h2: 28,         // 14pt
  h3: 22,         // 11pt — Arial bold for sub-sections
  body: 22,       // 11pt
  small: 18,      // 9pt
};

// ===== Paragraph builders ===================================================

function Eyebrow(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: SANS,
        size: SIZE.eyebrow,
        color: COLOR.navy65,
        characterSpacing: 40,  // ~10% tracking
      }),
    ],
    spacing: { after: 120 },
  });
}

function DisplayTitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: MIX, size: SIZE.display, color: COLOR.navy })],
    spacing: { after: 100 },
  });
}

function Subtitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: MIX, size: SIZE.subtitle, color: COLOR.navy65, italics: true })],
    spacing: { after: 360 },
  });
}

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: MIX, size: SIZE.h1, color: COLOR.navy })],
    spacing: { before: 480, after: 200 },
  });
}

function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: MIX, size: SIZE.h2, color: COLOR.navy })],
    spacing: { before: 360, after: 160 },
  });
}

function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: SANS,
        size: SIZE.h3,
        color: COLOR.navy,
        bold: true,
        characterSpacing: 20,
      }),
    ],
    spacing: { before: 240, after: 120 },
  });
}

function SubHead(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: SANS, size: SIZE.body, color: COLOR.navy65, italics: true })],
    spacing: { before: 60, after: 160 },
  });
}

function P(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: SANS, size: SIZE.body, color: COLOR.navy })],
    spacing: { after: 140 },
  });
}

function PIntro(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: SANS, size: SIZE.body, color: COLOR.navy })],
    spacing: { after: 100 },
  });
}

function Bullet(runs, level = 0) {
  const arr = Array.isArray(runs) ? runs : [runs];
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    children: arr.map((r) =>
      typeof r === 'string'
        ? new TextRun({ text: r, font: SANS, size: SIZE.body, color: COLOR.navy })
        : new TextRun({ font: SANS, size: SIZE.body, color: COLOR.navy, ...r }),
    ),
    spacing: { after: 60 },
  });
}

function Num(text, reference) {
  return new Paragraph({
    numbering: { reference, level: 0 },
    children: [new TextRun({ text, font: SANS, size: SIZE.body, color: COLOR.navy })],
    spacing: { after: 60 },
  });
}

function Note(label, body) {
  // McDermott inline-alert pattern: pale-blue fill, navy text, accent left border.
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: COLOR.paleBlue, color: 'auto' },
    border: {
      left: { style: BorderStyle.SINGLE, size: 24, color: COLOR.blue, space: 8 },
      top: { style: BorderStyle.SINGLE, size: 2, color: COLOR.paleBlue, space: 8 },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR.paleBlue, space: 8 },
      right: { style: BorderStyle.SINGLE, size: 2, color: COLOR.paleBlue, space: 8 },
    },
    children: [
      new TextRun({ text: label + '  ', bold: true, font: SANS, size: SIZE.body, color: COLOR.navy }),
      new TextRun({ text: body, font: SANS, size: SIZE.body, color: COLOR.navy }),
    ],
    spacing: { before: 160, after: 200 },
  });
}

function Divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.border, space: 8 } },
    spacing: { before: 80, after: 80 },
    children: [],
  });
}

// ===== Content ==============================================================

const children = [];

// Title block ---------------------------------------------------------------
children.push(Eyebrow('Demo walkthrough'));
children.push(DisplayTitle('Contract Manager'));
children.push(Subtitle('A clickable visualization of the procurement platform'));
children.push(Divider());

// About ---------------------------------------------------------------------
children.push(H2('About this document'));
children.push(
  P(
    "Contract Manager is the new internal platform being built for Procurement to run the full contract lifecycle across Event, Facilities, and IT — from intake through review, signature, expiration, and archive. The attached file, Contract-Manager-Demo.html, is a clickable visualization of how the product will work. Every screen, badge, button, and stepper in this document maps to something you can click in the demo.",
  ),
);
children.push(
  P(
    "It is not a live system. There is no database, no firm authentication, and no integration with Spend Connect, iManage, or Outlook — those are planned. Every contract, vendor, and person you see is synthetic. No real client information is present.",
  ),
);
children.push(
  P(
    "Use this guide alongside the demo. Open the HTML file in a browser on one side of your screen and this Word document on the other. The Try this sections give you a specific click path that exercises each screen's main behaviors.",
  ),
);

// Opening -------------------------------------------------------------------
children.push(H2('Opening the demo'));
children.push(Num('Save the attached Contract-Manager-Demo.html somewhere convenient. The Desktop is fine.', 'open'));
children.push(Num('Double-click the file. It opens in your default browser. Chrome or Edge work best.', 'open'));
children.push(Num('No install, no login, no setup. The only network call is for one icon font.', 'open'));
children.push(Num('The first screen is Active contracts — the daily landing screen for Procurement.', 'open'));

// Tour 1 - Dashboard --------------------------------------------------------
children.push(H1('Tour 1 — Active contracts dashboard'));
children.push(SubHead("Procurement's daily view of every contract in motion."));

children.push(H3('What you see'));
children.push(Bullet([{ text: 'Date subtitle', bold: true }, ' under the page title — anchors the queue to today.']));
children.push(Bullet([
  { text: 'Triage chip strip', bold: true },
  ' with six filters: All active, Needs your action, In attorney review, Awaiting signature, Expiring ≤ 14 days, On hold & closed. Each chip shows a live count. The orange dot on "Needs your action" marks contracts requiring intervention.',
]));
children.push(Bullet([{ text: 'Search bar', bold: true }, ' — filters by contract title, vendor name, or contract number.']));
children.push(Bullet([{ text: 'Sortable columns', bold: true }, ' — click any column header to sort ascending or descending. The caret indicator shows the active sort.']));
children.push(Bullet([
  { text: 'Contract table', bold: true },
  ' with ten columns: attention flag, contract title and number, vendor, category icon, stage badge, assigned reviewer and team, value, expiry, last action, and next action due.',
]));
children.push(Bullet([{ text: 'Two primary actions', bold: true }, ' in the top right — Bulk upload (for seeding from Spend Connect) and New contract (start an intake).']));
children.push(Bullet([
  { text: 'Color cues', bold: true },
  ' — orange "in N days" warnings on contracts approaching expiry; "Expired" badges in pale orange on contracts past their term.',
]));

children.push(H3('Try this'));
children.push(Num('Click the "Needs your action" chip. The table filters to contracts with the orange attention flag.', 't1'));
children.push(Num('Click "Expiring ≤ 14 days". Note the warning icons on the dates.', 't1'));
children.push(Num('Click "All active" to clear the filter.', 't1'));
children.push(Num('Click the Value column header. The table sorts by contract value. Click again to reverse.', 't1'));
children.push(Num('Type "Microsoft" into the search bar. Only Microsoft-vendor contracts remain.', 't1'));
children.push(Num('Clear the search and click any row to open its detail screen.', 't1'));

// Tour 2 - Detail -----------------------------------------------------------
children.push(H1('Tour 2 — Contract detail'));
children.push(SubHead('The workhorse screen. Open any contract from the dashboard to see this.'));
children.push(
  Note(
    'Recommended starting contract',
    '"Relativity One — eDiscovery platform renewal" (top of the table). It has the orange attention flag and an active review in progress, so most of the screen elements are populated.',
  ),
);

children.push(H3('The header strip'));
children.push(Bullet([{ text: 'Eyebrow', bold: true }, ' above the title shows the contract number and the category icon.']));
children.push(Bullet([{ text: 'Sub-line', bold: true }, ' below the title shows the vendor (click to open the vendor modal), the value, and the current stage badge.']));
children.push(Bullet([{ text: 'Primary action button', bold: true }, ' on the right adapts to the current stage: Advance to ..., Resume review (when on hold), Reopen contract (when canceled or terminated), or Start renewal (when expired or completed).']));

children.push(H3('The review workflow'));
children.push(Bullet([
  { text: 'Lifecycle stepper', bold: true },
  ' shows all nine forward stages: Intake → Vendor → Requestor → Legal → GCO → InfoSec → Privacy → Signature → Completed. Completed stages get a checkmark. The active stage is highlighted.',
]));
children.push(Bullet([
  { text: 'Inline alert', bold: true },
  ' appears when something needs attention — overdue approvals, unassigned reviewer, expiring soon, on-hold, etc. It uses pale-gold or pale-orange backgrounds with a left accent bar.',
]));
children.push(Bullet([
  { text: 'Attorney approvals panel', bold: true },
  ' shows every team that needs to sign off (GCO, the lead-reviewer team, InfoSec for IT contracts, Privacy if PHI or personal data is flagged). Each team has a status badge — Approved, Pending, or Overdue — and Send reminder / Record approval buttons while the contract is in active review.',
]));

children.push(H3('The five tabs'));
children.push(Bullet([{ text: 'Details', bold: true }, ' — vendor, category, IT type (for IT contracts), value, term, requester, request date, risk review (PII / PHI / AI flags), and description.']));
children.push(Bullet([{ text: 'Documents', bold: true }, ' — standard contract artifacts (MSA, Order form, DPA, etc.) with version numbers and last-updated metadata.']));
children.push(Bullet([{ text: 'Comments', bold: true }, " — internal review-team notes, with the author's name, role, and timestamp. Add new comments at the bottom."]));
children.push(Bullet([{ text: 'Notes', bold: true }, ' — meeting, call, email, or general note entries. Each gets a type chip, a date, and a participant list. Useful for capturing offline discussions on the contract.']));
children.push(Bullet([{ text: 'Activity', bold: true }, ' — full audit trail. Every status change, approval, comment, and reassignment is recorded with an icon, description, and timestamp.']));

children.push(H3('The right rail'));
children.push(Bullet([
  { text: 'Status', bold: true },
  ' card — current stage badge plus a dropdown that can move the contract to any of the 13 statuses (In process, With vendor, With requestor, With legal, With GCO, With InfoSec, With Privacy, Out for signature, Completed, On hold, Canceled, Expired, Terminated). Every change is logged in Activity.',
]));
children.push(Bullet([{ text: 'Action dates', bold: true }, ' — Last action and Next action due, with overdue warnings shown in navy text and an orange warning icon.']));
children.push(Bullet([{ text: 'Lead reviewer', bold: true }, " — who's assigned, including their team. A Reassign button lets you change the lead."]));
children.push(Bullet([{ text: 'Key facts', bold: true }, ' — at-a-glance snapshot of value, term, requester, and expiry.']));

children.push(H3('Try this'));
children.push(Num('On the approvals panel, click Send reminder next to a Pending team. A toast confirms the reminder was sent. Switch to the Activity tab and see the new entry at the top.', 't2'));
children.push(Num('Click Record approval on a Pending team. The badge changes to Approved and the progress count at the top of the panel updates.', 't2'));
children.push(Num("Switch to the Notes tab. Read the meeting entry. Then log a new note: pick Call, today's date, type a few participants, write a sentence, and click Add note.", 't2'));
children.push(Num('Click the moon icon at the top right of the page. The whole interface flips to dark mode. The badges, table, and stepper all stay readable.', 't2'));
children.push(Num('In the right rail, change the Status dropdown to "On hold". The entire screen updates — the lifecycle stepper mutes, an "On hold" flag appears, the alert at the top changes to "Paused", and the primary action button becomes Resume review.', 't2'));
children.push(Num('Change the status back to "With InfoSec". Now click the Advance to Privacy button at the top. The stepper moves forward and Activity logs the change.', 't2'));

// Tour 3 - Intake -----------------------------------------------------------
children.push(H1('Tour 3 — New contract intake'));
children.push(SubHead('How Procurement and Requesters submit a new contract for review.'));
children.push(P('Click New contract from the dashboard or the sidebar.'));

children.push(H3('What you see'));
children.push(Bullet([{ text: 'Category picker', bold: true }, ' — three cards for Event, Facilities, and IT. Each opens a different intake form because each category collects different fields.']));
children.push(Bullet([
  { text: 'For IT (the most complete form)', bold: true },
  ', the intake captures: basics (title, vendor, value, term dates, description), the IT contract type (Software or Professional services), category-specific fields, and a risk review section.',
]));
children.push(Bullet([{ text: 'IT contract type', bold: true }, ' — picking Software reveals deployment, license seats, and data hosting region. Picking Professional services reveals engagement type, estimated hours, scope, and on-site access.']));
children.push(Bullet([{ text: 'Risk review', bold: true }, ' — three Yes/No questions about personal data, PHI, and AI use. The answers drive which attorney teams will review the contract.']));
children.push(Bullet([
  { text: 'Live review routing', bold: true },
  ' — a callout below the form shows in real time which attorney teams will be involved based on the category and risk answers. GCO is always included; InfoSec for IT; Privacy if personal data or PHI is flagged.',
]));

children.push(H3('Try this'));
children.push(Num('Click New contract, then choose IT.', 't3'));
children.push(Num('Under "IT contract type", choose Software. The Deployment, License seats, and Data hosting region fields appear.', 't3'));
children.push(Num('Scroll to the Risk review section. Change "Accesses PHI" to Yes.', 't3'));
children.push(Num('Look at the "Review routing" callout below the form. Privacy is now in the routing line.', 't3'));
children.push(Num('Change "Accesses PHI" back to No. Privacy drops off.', 't3'));
children.push(Num('Click Submit for review. A toast confirms submission and you return to the dashboard. (The demo does not actually save it — production will.)', 't3'));

// Tour 4 - Vendors ----------------------------------------------------------
children.push(H1('Tour 4 — Vendor master'));
children.push(SubHead('The vendor list Procurement maintains. Drives review decisions on every contract.'));
children.push(P('Click Vendors in the sidebar.'));

children.push(H3('What you see'));
children.push(Bullet([
  { text: 'Status badges', bold: true },
  ' — every vendor has one of four statuses: Preferred (preferred panel, fast-track terms), Standard (approved, no special handling), Difficult (manage closely; budget overruns, slow redlines, missed deliverables), or Blacklisted (do not re-engage without GC sign-off).',
]));
children.push(Bullet([{ text: 'Filter chips', bold: true }, ' at the top of the toolbar — All, Preferred, Standard, Difficult, Blacklisted.']));
children.push(Bullet([{ text: 'Search and sort', bold: true }, ' — same pattern as the contracts table.']));
children.push(Bullet([{ text: 'Active / All counts', bold: true }, ' — second-to-last column. Shows how many active contracts the firm has with this vendor versus the all-time count.']));
children.push(Bullet([
  { text: 'Vendor detail modal', bold: true },
  ' — click any row to open. Shows status, vendor-since year, a short note explaining the status, primary contact, email, phone, location, and every contract in Contract Manager linked to that vendor.',
]));

children.push(H3('Try this'));
children.push(Num('Click the Preferred filter. The table reduces to just the preferred-panel vendors.', 't4'));
children.push(Num("Clear the filter and find Vault Records Co. (a Blacklisted vendor). Click the row. The note explains why they're blacklisted.", 't4'));
children.push(Num("From the vendor modal, click any linked contract in the list. The modal closes and you jump directly to that contract's detail screen.", 't4'));
children.push(Num("Click any vendor link on a contract's detail screen — they all open this same modal.", 't4'));

// Tour 5 - Bulk upload ------------------------------------------------------
children.push(H1('Tour 5 — Bulk upload'));
children.push(SubHead('How Procurement will seed Contract Manager from the Spend Connect export.'));
children.push(P('Click Bulk upload in the sidebar.'));

children.push(H3('What you see'));
children.push(Bullet([{ text: 'Drop zone', bold: true }, ' for the CSV. In the demo, click Simulate upload to load the sample export.']));
children.push(Bullet([
  { text: 'Preview table', bold: true },
  ' — every row from the upload is parsed and validated per cell. Cells with errors get a pale-orange background and a red dot in the corner. The error text appears under the cell.',
]));
children.push(Bullet([{ text: 'Stats strip', bold: true }, ' — Total, Ready, With errors, and Skipped counts. Updates as you fix or skip rows.']));
children.push(Bullet([{ text: 'Inline editing', bold: true }, ' — click any cell to edit. Vendor and Category open dropdowns. Dates use a date picker. Text and numeric fields use an input. Save by clicking away, pressing Enter, or pressing Tab.']));
children.push(Bullet([{ text: 'Skip / Restore', bold: true }, ' — exclude any row from commit. Skipped rows display in line-through gray. Skip changes its label to Restore so you can bring the row back.']));
children.push(Bullet([{ text: 'Commit button', bold: true }, ' — top right. Only the Ready rows commit. The button is disabled if there are zero ready rows.']));

children.push(H3('The deliberately-messy sample'));
children.push(P('The sample upload contains twelve rows that mirror the real mess of a legacy export. Errors you will see include:'));
children.push(Bullet('An empty contract title'));
children.push(Bullet('Category "Tech" instead of "IT"'));
children.push(Bullet('Value "TBD" instead of a number'));
children.push(Bullet('Vendor "Microsoft Corp" not matched to the master "Microsoft Corporation"'));
children.push(Bullet('An end date before the start date'));
children.push(Bullet('Missing end date'));
children.push(Bullet('Category "Facilites" misspelling'));
children.push(Bullet('Value "$120,000" with dollar sign and comma'));

children.push(H3('Try this'));
children.push(Num('Click Simulate upload. The preview loads with the stats showing roughly Total 12, Ready 1, With errors 11.', 't5'));
children.push(Num('Click the cell containing "Tech". A dropdown appears. Pick "IT". The cell turns clean and Ready goes up by one.', 't5'));
children.push(Num('Click the empty title cell on row 6. Type a name, click away. Error clears.', 't5'));
children.push(Num('Click Skip on the row with "Microsoft Corp". The row goes line-through gray, Skipped goes up by one.', 't5'));
children.push(Num('Click Restore on that same row to bring it back.', 't5'));
children.push(Num('Click Commit X rows. A toast confirms the commit and you return to the dashboard. (Production will actually create the records.)', 't5'));

// Theme ---------------------------------------------------------------------
children.push(H1('Light and dark themes'));
children.push(
  P(
    "The moon icon in the top right of every screen switches the entire interface between light and dark mode. Both modes use the same McDermott design tokens (navy base, pale-fill accents, blue or teal interactive colors) and meet the firm's accessibility contrast standard. Try toggling on any screen — note that the badge colors stay legible, the focus rings adapt, and the navy sidebar stays consistent across both modes.",
  ),
);

// What it doesn't do --------------------------------------------------------
children.push(H1("What the demo does not do"));
children.push(P('Important to set expectations before showing this to stakeholders:'));
children.push(Bullet('No real data. Every contract, vendor, person, dollar amount, and date is synthetic.'));
children.push(Bullet('No backend. Refreshing the browser resets all state. Comments, status changes, and submitted intakes do not persist.'));
children.push(Bullet('No authentication. Production will use Entra ID with role-based access (Procurement, Requester, Attorney Reviewer).'));
children.push(Bullet('No integrations. Spend Connect, iManage, Outlook, and Microsoft Graph are planned but not in this prototype.'));
children.push(Bullet('Some screens are stubs. Archive and My submissions are minimal in this demo; production will fully populate them.'));
children.push(Bullet('Submissions, edits, and approvals show a toast confirmation but do not actually save.'));

// Questions -----------------------------------------------------------------
children.push(H1('Questions to keep in mind while reviewing'));
children.push(P('Things to flag, push back on, or confirm as you click through:'));
children.push(Bullet('Are the 13 lifecycle statuses the right set, or are we missing one? Is the forward sequence (Vendor → Requestor → Legal → GCO → InfoSec → Privacy → Signature → Completed) correct?'));
children.push(Bullet('Are the six dashboard triage chips the right way to slice the daily queue, or are there others you would prefer (e.g. "Awaiting my approval", "New this week", "High value")?'));
children.push(Bullet('Are the four attorney review teams (GCO, the lead-reviewer team, InfoSec, Privacy) covered correctly? Is anyone missing?'));
children.push(Bullet('For IT contracts, are personal data, PHI, and AI the right three risk-review questions? Anything else we should ask at intake?'));
children.push(Bullet('Are there fields missing from the intake form — specifically for Event and Facilities, which are lighter than IT?'));
children.push(Bullet('Is the bulk upload preview-and-fix flow how Procurement would want to seed the system from Spend Connect, or do you want a different shape (e.g. CSV download and re-import)?'));
children.push(Bullet('Any vendor status categories beyond Preferred / Standard / Difficult / Blacklisted? Is the threshold for "Difficult" the right one?'));
children.push(Bullet("What's the ideal next-action-due cadence for each stage? In the demo, contracts flagged as needing attention show as 2 days overdue — is that the right window?"));

// Next steps ----------------------------------------------------------------
children.push(H1('Next steps'));
children.push(Bullet('Reply with feedback on screen flows, fields, terminology, or missing functionality. Specifics help most — pointing at a screen and saying "this column should come first" or "we need a field for X" is exactly what we need.'));
children.push(Bullet('The development team can iterate the prototype before production build begins. Changes at this stage cost minutes; changes after the build starts cost days.'));
children.push(Bullet("Production build follows McDermott's Tier 1 internal-app framework: Entra ID authentication, Azure SQL backend, audit columns on every record, role-based access control, and accessibility compliance to WCAG 2.2 AA."));

// ===== Document configuration ==============================================

function numberConfig(reference) {
  return {
    reference,
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: '%1.',
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: 720, hanging: 360 } },
          run: { font: SANS, size: SIZE.body, color: COLOR.navy },
        },
      },
    ],
  };
}

const doc = new Document({
  creator: 'McDermott Will & Schulte AI Solutions',
  title: 'Contract Manager — Demo Walkthrough',
  description: 'User guide for the Contract Manager demo HTML',
  styles: {
    default: { document: { run: { font: SANS, size: SIZE.body, color: COLOR.navy } } },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: SIZE.h1, font: MIX, color: COLOR.navy },
        paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: SIZE.h2, font: MIX, color: COLOR.navy },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: SIZE.h3, font: SANS, bold: true, color: COLOR.navy },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 720, hanging: 360 } },
              run: { font: SANS, size: SIZE.body, color: COLOR.navy },
            },
          },
        ],
      },
      numberConfig('open'),
      numberConfig('t1'),
      numberConfig('t2'),
      numberConfig('t3'),
      numberConfig('t4'),
      numberConfig('t5'),
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1-inch
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.border, space: 4 } },
              children: [
                new TextRun({
                  text: 'CONTRACT MANAGER  ·  DEMO WALKTHROUGH',
                  font: SANS,
                  size: SIZE.small,
                  color: COLOR.navy65,
                  characterSpacing: 40,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', font: SANS, size: SIZE.small, color: COLOR.navy65 }),
                new TextRun({ children: [PageNumber.CURRENT], font: SANS, size: SIZE.small, color: COLOR.navy65 }),
                new TextRun({ text: ' of ', font: SANS, size: SIZE.small, color: COLOR.navy65 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: SANS, size: SIZE.small, color: COLOR.navy65 }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const primaryPath = 'C:/Users/laura/OneDrive/Desktop/Contract-Manager-Demo-Guide.docx';
const fallbackPath = 'C:/Users/laura/OneDrive/Desktop/Contract-Manager-Demo-Guide-NEW.docx';
Packer.toBuffer(doc).then((buffer) => {
  try {
    fs.writeFileSync(primaryPath, buffer);
    console.log('Saved:', primaryPath);
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      fs.writeFileSync(fallbackPath, buffer);
      console.log('Primary file locked. Saved fallback:', fallbackPath);
    } else {
      throw err;
    }
  }
  console.log('Size:', (buffer.length / 1024).toFixed(1), 'KB');
});
