// Contract Manager — seeded data. Realistic firm procurement records.
// Exposed on window.CM for all screens.
(function () {
  // Lifecycle statuses → McDermott Badge status mapping.
  //   kind: 'path'  — sequential step on the review workflow
  //         'done'  — successful terminal (Completed)
  //         'hold'  — paused, can resume
  //         'closed'— terminal exception (Canceled / Expired / Terminated)
  const STAGES = {
    in_process:        { label: 'In process',       status: 'draft',    kind: 'path' },
    with_vendor:       { label: 'With vendor',       status: 'info',     kind: 'path' },
    with_requestor:    { label: 'With requestor',    status: 'info',     kind: 'path' },
    with_legal:        { label: 'With legal',        status: 'pending',  kind: 'path' },
    with_gco:          { label: 'With GCO',          status: 'pending',  kind: 'path' },
    with_infosec:      { label: 'With InfoSec',      status: 'pending',  kind: 'path' },
    with_privacy:      { label: 'With Privacy',      status: 'pending',  kind: 'path' },
    out_for_signature: { label: 'Out for signature', status: 'info',     kind: 'path' },
    completed:         { label: 'Completed',         status: 'live',     kind: 'done' },
    on_hold:           { label: 'On hold',           status: 'hold',     kind: 'hold' },
    canceled:          { label: 'Canceled',          status: 'failed',   kind: 'closed' },
    expired:           { label: 'Expired',           status: 'archived', kind: 'closed' },
    terminated:        { label: 'Terminated',        status: 'failed',   kind: 'closed' },
  };

  // Ordered forward lifecycle (drives the workflow stepper + stage sort).
  const STAGE_ORDER = [
    'in_process', 'with_vendor', 'with_requestor', 'with_legal', 'with_gco',
    'with_infosec', 'with_privacy', 'out_for_signature', 'completed',
  ];
  const STAGE_STEP = [
    { id: 'in_process',        label: 'Intake' },
    { id: 'with_vendor',       label: 'Vendor' },
    { id: 'with_requestor',    label: 'Requestor' },
    { id: 'with_legal',        label: 'Legal' },
    { id: 'with_gco',          label: 'GCO' },
    { id: 'with_infosec',      label: 'InfoSec' },
    { id: 'with_privacy',      label: 'Privacy' },
    { id: 'out_for_signature', label: 'Signature' },
    { id: 'completed',         label: 'Completed' },
  ];

  // Stage groupings used across screens.
  const REVIEW_STAGES    = ['with_legal', 'with_gco', 'with_infosec', 'with_privacy'];
  const EXTERNAL_STAGES  = ['with_vendor', 'with_requestor', 'out_for_signature'];
  const EXCEPTION_STAGES = ['on_hold', 'canceled', 'expired', 'terminated'];
  const CLOSED_STAGES    = ['completed', 'canceled', 'expired', 'terminated'];

  // Sort rank covering all 13 statuses (forward path first, exceptions last).
  const STAGE_RANK = {};
  STAGE_ORDER.forEach((id, i) => { STAGE_RANK[id] = i; });
  EXCEPTION_STAGES.forEach((id, i) => { STAGE_RANK[id] = STAGE_ORDER.length + i; });

  const CATEGORIES = {
    Event:      { icon: 'ticket' },
    Facilities: { icon: 'wrench' },
    IT:         { icon: 'desktop' },
  };

  // expiresDays: days from "today" until expiration.
  //   null     = no active term (not executed / closed without a live term)
  //   negative = already past expiry (expired contracts)
  const CONTRACTS = [
    { num: 'CTR-2026-0142', title: 'Relativity One — eDiscovery platform renewal', vendor: 'Relativity ODA LLC', category: 'IT',
      stage: 'with_infosec', reviewer: 'Priya Nair', team: 'InfoSec', value: 486000, expiresDays: 38, updated: '40m ago', attention: true,
      action: 'InfoSec review overdue 2 days' },
    { num: 'CTR-2026-0139', title: 'Annual partner retreat — venue & catering', vendor: 'Halcyon Events Group', category: 'Event',
      stage: 'out_for_signature', reviewer: 'Marcus Webb', team: 'Corporate', value: 212500, expiresDays: 21, updated: '2h ago', attention: true,
      action: 'Signature packet awaiting your send' },
    { num: 'CTR-2026-0137', title: 'Microsoft 365 E5 enterprise agreement', vendor: 'Microsoft Corporation', category: 'IT',
      stage: 'with_privacy', reviewer: 'Dana Olsson', team: 'Privacy', value: 1340000, expiresDays: 64, updated: '5h ago', attention: false, action: null },
    { num: 'CTR-2026-0131', title: 'Floor 14 HVAC service & maintenance', vendor: 'Meridian Facilities Co.', category: 'Facilities',
      stage: 'completed', reviewer: 'Tom Reyes', team: 'GCO', value: 96400, expiresDays: 11, updated: '1d ago', attention: true,
      action: 'Expires in 11 days — start renewal' },
    { num: 'CTR-2026-0128', title: 'Litigation hold notification system', vendor: 'Exterro, Inc.', category: 'IT',
      stage: 'with_legal', reviewer: 'Priya Nair', team: 'InfoSec', value: 158000, expiresDays: 90, updated: '1d ago', attention: false, action: null },
    { num: 'CTR-2026-0124', title: 'Westlaw Edge research subscription', vendor: 'Thomson Reuters', category: 'IT',
      stage: 'out_for_signature', reviewer: 'Marcus Webb', team: 'Corporate', value: 624000, expiresDays: 30, updated: '2d ago', attention: false, action: null },
    { num: 'CTR-2026-0119', title: 'Client appreciation gala — production', vendor: 'Lumen Productions', category: 'Event',
      stage: 'in_process', reviewer: null, team: null, value: 174000, expiresDays: null, updated: '2d ago', attention: true,
      action: 'Unassigned — needs a reviewer' },
    { num: 'CTR-2026-0116', title: 'Document destruction & shredding services', vendor: 'SecureShred Partners', category: 'Facilities',
      stage: 'completed', reviewer: 'Tom Reyes', team: 'GCO', value: 41200, expiresDays: 156, updated: '3d ago', attention: false, action: null },
    { num: 'CTR-2026-0112', title: 'Generative AI contract-review pilot', vendor: 'Harvey AI, Inc.', category: 'IT',
      stage: 'with_privacy', reviewer: 'Dana Olsson', team: 'Privacy', value: 295000, expiresDays: 47, updated: '3d ago', attention: true,
      action: 'AI + PHI flags — Privacy escalation' },
    { num: 'CTR-2026-0108', title: 'Reception & lobby renovation', vendor: 'Atrium Build Group', category: 'Facilities',
      stage: 'with_vendor', reviewer: 'Lauren Pike', team: 'Litigation', value: 388000, expiresDays: 60, updated: '4d ago', attention: false, action: null },
    { num: 'CTR-2026-0103', title: 'CLE summit — speaker AV & livestream', vendor: 'Halcyon Events Group', category: 'Event',
      stage: 'with_requestor', reviewer: 'Marcus Webb', team: 'Corporate', value: 68500, expiresDays: 14, updated: '5d ago', attention: false, action: null },
    { num: 'CTR-2026-0098', title: 'Managed print fleet lease', vendor: 'Canon Business Solutions', category: 'Facilities',
      stage: 'completed', reviewer: 'Tom Reyes', team: 'GCO', value: 132000, expiresDays: 203, updated: '1w ago', attention: false, action: null },
    { num: 'CTR-2026-0094', title: 'iManage Work cloud migration — SOW', vendor: 'iManage LLC', category: 'IT',
      stage: 'with_gco', reviewer: 'Priya Nair', team: 'InfoSec', value: 540000, expiresDays: 120, updated: '1w ago', attention: false, action: null },
    { num: 'CTR-2026-0089', title: 'Office coffee & pantry program', vendor: 'Bright Bean Services', category: 'Facilities',
      stage: 'completed', reviewer: 'Tom Reyes', team: 'GCO', value: 28800, expiresDays: 9, updated: '1w ago', attention: true,
      action: 'Expires in 9 days — start renewal' },
    { num: 'CTR-2026-0081', title: 'Trial graphics & demonstratives studio', vendor: 'Vantage Visuals', category: 'Event',
      stage: 'on_hold', reviewer: 'Lauren Pike', team: 'Litigation', value: 92000, expiresDays: null, updated: '1w ago', attention: true,
      action: 'On hold — awaiting budget approval' },
    { num: 'CTR-2026-0076', title: 'Holiday party — venue hold', vendor: 'Halcyon Events Group', category: 'Event',
      stage: 'canceled', reviewer: 'Marcus Webb', team: 'Corporate', value: 64000, expiresDays: null, updated: '2w ago', attention: false, action: null },
    { num: 'CTR-2026-0067', title: 'Legacy timekeeping system support', vendor: 'Chronos Systems', category: 'IT',
      stage: 'expired', reviewer: 'Priya Nair', team: 'InfoSec', value: 54000, expiresDays: -12, updated: '2w ago', attention: true,
      action: 'Expired 12 days ago — renew or retire' },
    { num: 'CTR-2026-0058', title: 'Off-site records storage', vendor: 'Vault Records Co.', category: 'Facilities',
      stage: 'terminated', reviewer: 'Tom Reyes', team: 'GCO', value: 38000, expiresDays: null, updated: '3w ago', attention: false, action: null },
  ];

  // Vendor master — status drives workflow decisions (Preferred / Standard /
  // Difficult / Blacklisted). Contract counts + value are computed live from CONTRACTS.
  const VENDOR_BADGE = { Preferred: 'live', Standard: 'draft', Difficult: 'pending', Blacklisted: 'failed' };
  const VENDORS = {
    'Microsoft Corporation': { status: 'Preferred', category: 'IT', contact: 'Sara Lindqvist', email: 'sara.lindqvist@microsoft.example', phone: '+1 (425) 555-0142', location: 'Redmond, WA', since: 2014, note: 'On the firm\u2019s preferred panel \u2014 fast turnaround on standard terms.' },
    'Relativity ODA LLC': { status: 'Preferred', category: 'IT', contact: 'Marcus Hale', email: 'm.hale@relativity.example', phone: '+1 (312) 555-0188', location: 'Chicago, IL', since: 2017, note: 'Preferred eDiscovery partner. Predictable redlines and pricing.' },
    'Thomson Reuters': { status: 'Preferred', category: 'IT', contact: 'Dana Kohl', email: 'dana.kohl@thomsonreuters.example', phone: '+1 (646) 555-0173', location: 'New York, NY', since: 2012, note: 'Long-standing research vendor on the preferred panel.' },
    'Halcyon Events Group': { status: 'Preferred', category: 'Event', contact: 'Priya Raman', email: 'priya@halcyonevents.example', phone: '+1 (212) 555-0119', location: 'New York, NY', since: 2019, note: 'Reliable across multiple firm events; standard terms accepted.' },
    'iManage LLC': { status: 'Standard', category: 'IT', contact: 'Tom Becker', email: 'tbecker@imanage.example', phone: '+1 (312) 555-0155', location: 'Chicago, IL', since: 2016, note: 'Approved vendor. No outstanding concerns.' },
    'Harvey AI, Inc.': { status: 'Standard', category: 'IT', contact: 'Elise Fontaine', email: 'elise@harvey.example', phone: '+1 (415) 555-0190', location: 'San Francisco, CA', since: 2024, note: 'New vendor \u2014 AI tooling under Privacy and InfoSec review.' },
    'Exterro, Inc.': { status: 'Standard', category: 'IT', contact: 'Greg Mott', email: 'gmott@exterro.example', phone: '+1 (503) 555-0166', location: 'Portland, OR', since: 2018, note: 'Approved vendor. No outstanding concerns.' },
    'Meridian Facilities Co.': { status: 'Standard', category: 'Facilities', contact: 'Carla Nunes', email: 'carla@meridianfac.example', phone: '+1 (213) 555-0177', location: 'Los Angeles, CA', since: 2015, note: 'Approved facilities vendor. Standard terms.' },
    'SecureShred Partners': { status: 'Standard', category: 'Facilities', contact: 'Bill Ortega', email: 'bill@secureshred.example', phone: '+1 (312) 555-0144', location: 'Chicago, IL', since: 2016, note: 'Approved vendor. Certificates of destruction on file.' },
    'Canon Business Solutions': { status: 'Standard', category: 'Facilities', contact: 'Janet Pryce', email: 'janet.pryce@canon.example', phone: '+1 (516) 555-0133', location: 'Melville, NY', since: 2013, note: 'Approved vendor. No outstanding concerns.' },
    'Bright Bean Services': { status: 'Standard', category: 'Facilities', contact: 'Owen Cole', email: 'owen@brightbean.example', phone: '+1 (312) 555-0120', location: 'Chicago, IL', since: 2021, note: 'Approved vendor. Small pantry program.' },
    'Vantage Visuals': { status: 'Standard', category: 'Event', contact: 'Nina Foss', email: 'nina@vantagevisuals.example', phone: '+1 (312) 555-0162', location: 'Chicago, IL', since: 2022, note: 'Approved vendor. Trial graphics and demonstratives.' },
    'Atrium Build Group': { status: 'Difficult', category: 'Facilities', contact: 'Rick Salas', email: 'rick@atriumbuild.example', phone: '+1 (312) 555-0199', location: 'Chicago, IL', since: 2020, note: 'Budget overruns and slow redlines on the lobby renovation \u2014 manage closely.' },
    'Lumen Productions': { status: 'Difficult', category: 'Event', contact: 'Maya Brandt', email: 'maya@lumenprod.example', phone: '+1 (323) 555-0181', location: 'Los Angeles, CA', since: 2019, note: 'Missed deliverables on the last gala \u2014 hold to firm timelines.' },
    'Chronos Systems': { status: 'Difficult', category: 'IT', contact: 'Paul Devar', email: 'pdevar@chronos.example', phone: '+1 (408) 555-0150', location: 'San Jose, CA', since: 2011, note: 'Legacy platform, slow support response \u2014 evaluating replacement.' },
    'Vault Records Co.': { status: 'Blacklisted', category: 'Facilities', contact: 'Henry Lowe', email: 'h.lowe@vaultrecords.example', phone: '+1 (708) 555-0138', location: 'Cicero, IL', since: 2014, note: 'Data-handling incident under review \u2014 do not re-engage without GC sign-off.' },
  };
  const VENDOR_STATUS_ORDER = ['Preferred', 'Standard', 'Difficult', 'Blacklisted'];

  // Reviewers available for reassignment, by attorney review team.
  const REVIEWERS = [
    { name: 'Priya Nair', team: 'InfoSec' },
    { name: 'Dana Olsson', team: 'Privacy' },
    { name: 'Tom Reyes', team: 'GCO' },
    { name: 'Marcus Webb', team: 'Corporate' },
    { name: 'Lauren Pike', team: 'Litigation' },
  ];

  const REQUESTERS = ['Aaron Cole', 'Bianca Ruiz', 'David Stern', 'Emma Liang', 'Grace Okafor', 'Frank Moss'];

  // IT-specific risk-review attributes (drives the S5 intake form too).
  const IT_RISK = {
    'CTR-2026-0142': { type: 'Software', personalData: true,  phi: false, usesAI: false },
    'CTR-2026-0137': { type: 'Software', personalData: true,  phi: false, usesAI: true  },
    'CTR-2026-0128': { type: 'Software', personalData: true,  phi: false, usesAI: false },
    'CTR-2026-0124': { type: 'Software', personalData: false, phi: false, usesAI: true  },
    'CTR-2026-0112': { type: 'Professional services', personalData: true, phi: true, usesAI: true },
    'CTR-2026-0094': { type: 'Professional services', personalData: true, phi: false, usesAI: false },
  };

  const DOCSETS = {
    IT:         ['Master services agreement', 'Order form', 'Data processing addendum', 'Information security exhibit'],
    Event:      ['Services agreement', 'Event statement of work', 'Certificate of insurance'],
    Facilities: ['Services agreement', 'Scope of work', 'Certificate of insurance'],
  };

  // Per-stage timeline event copy (forward path).
  function stageEvent(id, c, requester) {
    switch (id) {
      case 'in_process':        return { icon: 'file-plus',         text: 'Contract created by ' + requester };
      case 'with_vendor':       return { icon: 'paper-plane-tilt',  text: 'Sent to ' + c.vendor + ' for redlines' };
      case 'with_requestor':    return { icon: 'user',              text: 'Returned to ' + requester + ' for clarification' };
      case 'with_legal':        return { icon: 'scales',            text: 'Routed to Legal for review' };
      case 'with_gco':          return { icon: 'gavel',             text: 'Routed to GCO for review' };
      case 'with_infosec':      return { icon: 'shield-check',      text: 'Routed to InfoSec for review' };
      case 'with_privacy':      return { icon: 'lock',              text: 'Routed to Privacy for review' };
      case 'out_for_signature': return { icon: 'signature',         text: 'Signature packet sent to ' + c.vendor };
      case 'completed':         return { icon: 'check-circle',      text: 'Fully executed — contract completed' };
      default:                  return { icon: 'circle',            text: id };
    }
  }
  const EXC_EVENT = {
    on_hold:    { icon: 'pause',           text: 'Placed on hold' },
    canceled:   { icon: 'x-circle',        text: 'Contract canceled' },
    expired:    { icon: 'clock-countdown', text: 'Term lapsed — contract expired' },
    terminated: { icon: 'prohibit',        text: 'Contract terminated' },
  };

  const MS_DAY = 86400000;
  const fmtDate = (d) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const toISO = (d) => d.toISOString().slice(0, 10);
  // Turn a relative "40m ago" / "2h ago" / "1d ago" / "1w ago" string into a Date.
  function parseAgo(s, now) {
    const m = /(\d+)\s*(m|h|d|w)/.exec(s || '');
    if (!m) return now;
    const n = +m[1];
    const mult = m[2] === 'm' ? 60000 : m[2] === 'h' ? 3600000 : m[2] === 'd' ? MS_DAY : 7 * MS_DAY;
    return new Date(now.getTime() - n * mult);
  }

  // Last action / next action due dates for a contract (used by the dashboard + detail).
  function actionDates(c) {
    const now = new Date();
    const seed = parseInt(c.num.slice(-3), 10) || 1;
    const lastActionISO = toISO(parseAgo(c.updated, now));
    let nextDueISO = null;
    if (c.stage === 'canceled' || c.stage === 'terminated') {
      nextDueISO = null;
    } else if (c.stage === 'completed' && c.expiresDays != null) {
      nextDueISO = toISO(new Date(now.getTime() + (c.expiresDays - 60) * MS_DAY)); // renewal lead time
    } else if (c.stage === 'in_process') {
      nextDueISO = toISO(new Date(now.getTime() + 3 * MS_DAY)); // newly intaken — assign + start review soon
    } else {
      const nextDays = c.attention ? -2 : (4 + (seed % 8));
      nextDueISO = toISO(new Date(now.getTime() + nextDays * MS_DAY));
    }
    return { lastActionISO, nextDueISO };
  }

  function buildDetail(c) {
    const seed = parseInt(c.num.slice(-3), 10) || 1;
    const requester = c.requester || REQUESTERS[seed % REQUESTERS.length];
    const now = new Date();
    const idx = STAGE_ORDER.indexOf(c.stage);
    const isException = EXCEPTION_STAGES.includes(c.stage);
    // "Executed" = a term has been in force (completed, or past-term exceptions).
    const executed = ['completed', 'expired', 'terminated'].includes(c.stage);

    let termStart, termEnd, hasTerm = true;
    if (c.expiresDays != null) {
      termEnd = new Date(now.getTime() + c.expiresDays * MS_DAY);
      termStart = new Date(termEnd.getTime() - 365 * MS_DAY);
    } else if (executed) {
      // Closed without a live term — show the most recent 1-year term ending recently.
      termEnd = new Date(now.getTime() - 30 * MS_DAY);
      termStart = new Date(termEnd.getTime() - 365 * MS_DAY);
    } else {
      termStart = new Date(now.getTime() + 21 * MS_DAY);
      termEnd = new Date(termStart.getTime() + 365 * MS_DAY);
      hasTerm = false;
    }
    const reqDate = new Date(now.getTime() - (25 + (seed % 70)) * MS_DAY);
    const term = (hasTerm ? '' : 'Proposed · ') + fmtDate(termStart) + ' – ' + fmtDate(termEnd);

    const risk = c.risk || IT_RISK[c.num] || (c.category === 'IT' ? { type: 'Software', personalData: false, phi: false, usesAI: false } : null);

    const description = c.description || (c.category + ' procurement — ' + c.vendor + '. '
      + (executed ? 'Executed agreement under active management by Procurement.'
                  : 'Submitted by the requester and under Procurement review ahead of execution.'));

    // Documents with light version history.
    const docs = (DOCSETS[c.category] || DOCSETS.IT).map((name, i) => {
      const version = ((seed + i) % 3) + 1;
      const updated = new Date(now.getTime() - (3 + i * 5 + (seed % 8)) * MS_DAY);
      return {
        name,
        version: 'v' + version,
        versions: version,
        updated: fmtDate(updated),
        by: i === 0 ? 'Lisa Farkas' : (c.reviewer || 'Lisa Farkas'),
      };
    });

    // Internal reviewer comments by stage.
    const r = c.reviewer, t = c.team;
    const comments = [];
    if (c.stage === 'in_process') {
      comments.push({ author: requester, role: 'Requester', when: '2 days ago', text: "Submitting for review — we'd like this in place before the current term lapses." });
    } else if (c.stage === 'with_vendor') {
      comments.push({ author: 'Lisa Farkas', role: 'Procurement', when: '1 day ago', text: 'Sent our redlines to ' + c.vendor + '. Waiting on their turn of the agreement before we route internally.' });
    } else if (c.stage === 'with_requestor') {
      comments.push({ author: 'Lisa Farkas', role: 'Procurement', when: '1 day ago', text: 'Back with ' + requester + ' — we need the confirmed scope and budget code before this can move to review.' });
    } else if (REVIEW_STAGES.includes(c.stage)) {
      comments.push({ author: r || 'Review team', role: t || 'Review', when: '1 day ago', text: 'Reviewing the terms now. Flagged the liability cap and the data-handling clause for the vendor to address.' });
      comments.push({ author: 'Lisa Farkas', role: 'Procurement', when: '4 hours ago', text: c.vendor + ' is on our preferred list, so let\u2019s prioritize turnaround on this one.' });
    } else if (c.stage === 'out_for_signature') {
      comments.push({ author: r || 'Review team', role: t || 'Review', when: '2 days ago', text: 'Redlines accepted. No outstanding concerns from ' + (t || 'the review team') + '.' });
      comments.push({ author: 'Lisa Farkas', role: 'Procurement', when: '1 day ago', text: 'Signature packet sent to ' + c.vendor + '. Awaiting countersignature.' });
    } else if (c.stage === 'completed') {
      comments.push({ author: 'Lisa Farkas', role: 'Procurement', when: '1 week ago', text: 'Executed and active. Renewal reminder scheduled for 60 days before expiry.' });
    } else if (c.stage === 'on_hold') {
      comments.push({ author: 'Lisa Farkas', role: 'Procurement', when: '3 days ago', text: 'Paused pending budget approval. Will resume the review once finance signs off.' });
    } else if (c.stage === 'canceled') {
      comments.push({ author: requester, role: 'Requester', when: '2 weeks ago', text: 'Withdrawing this request — the need went away on our side. Please close it out.' });
    } else if (c.stage === 'expired') {
      comments.push({ author: 'Lisa Farkas', role: 'Procurement', when: '2 weeks ago', text: 'Term has lapsed without a renewal. Confirming with the requester whether to renew or retire.' });
    } else if (c.stage === 'terminated') {
      comments.push({ author: 'Lisa Farkas', role: 'Procurement', when: '3 weeks ago', text: 'Terminated for convenience under the agreement. Final invoice reconciled and filed.' });
    }

    // System notification log (reverse-chronological).
    let activity;
    const whens = ['Today', 'Yesterday', '4 days ago', '1 week ago', '2 weeks ago', '3 weeks ago', '1 month ago', '5 weeks ago', '6 weeks ago', '2 months ago'];
    if (isException) {
      activity = [EXC_EVENT[c.stage], stageEvent('in_process', c, requester)];
    } else {
      activity = STAGE_ORDER.slice(0, idx + 1).map((id) => stageEvent(id, c, requester)).reverse();
    }
    activity = activity.map((e, i) => ({ ...e, when: whens[Math.min(i, whens.length - 1)] }));
    if (c.attention && c.action) activity.unshift({ icon: 'bell', text: c.action, when: 'Today' });

    // Required approvals — GCO reviews every contract, plus the lead reviewer's
    // team and the IT / privacy gates. Signature is blocked until all are in.
    const teams = [];
    const addTeam = (x) => { if (x && !teams.includes(x)) teams.push(x); };
    addTeam('GCO');
    addTeam(c.team);
    if (c.category === 'IT') addTeam('InfoSec');
    if (risk && (risk.personalData || risk.phi)) addTeam('Privacy');

    const reviewStart = STAGE_ORDER.indexOf('with_legal');
    const reviewEnd = STAGE_ORDER.indexOf('with_privacy');
    const approvals = teams.map((team, i) => {
      const approved = () => ({ team, status: 'approved', when: fmtDate(new Date(now.getTime() - (6 + i * 3) * MS_DAY)) });
      if (executed || c.stage === 'completed' || (idx > reviewEnd && idx !== -1)) return approved();
      if (c.stage === 'canceled') return { team, status: 'pending', when: null };
      if (c.stage === 'on_hold') return i === 0 ? approved() : { team, status: 'pending', when: null };
      if (idx !== -1 && idx < reviewStart) return { team, status: 'pending', when: null };
      // In review window: lead reviewer's team is still out (overdue if flagged), the rest are in.
      if (team === c.team) return { team, status: c.attention ? 'overdue' : 'pending', when: null };
      return approved();
    });

    // Last action / next action due dates.
    const { lastActionISO, nextDueISO } = actionDates(c);

    // Meeting notes & discussion log (most-recent first).
    const leadName = c.reviewer || 'review team';
    const meetings = [];
    if (c.stage !== 'in_process') {
      meetings.push({
        type: 'Meeting',
        date: fmtDate(new Date(now.getTime() - (7 + (seed % 5)) * MS_DAY)),
        participants: 'Lisa Farkas, ' + leadName + ', ' + c.vendor,
        text: 'Kickoff call to align on scope and timeline. ' + c.vendor + ' walked through their standard terms; we flagged the liability cap and the data-handling clause for follow-up.',
      });
    }
    if (REVIEW_STAGES.includes(c.stage) || ['out_for_signature', 'completed'].includes(c.stage)) {
      meetings.unshift({
        type: 'Call',
        date: fmtDate(new Date(now.getTime() - (3 + (seed % 4)) * MS_DAY)),
        participants: 'Lisa Farkas, ' + leadName,
        text: 'Internal sync on outstanding redlines. Agreed to push the indemnification language back to the vendor before routing for signature.',
      });
    }
    if (c.stage === 'on_hold') {
      meetings.unshift({
        type: 'Note',
        date: fmtDate(new Date(now.getTime() - 3 * MS_DAY)),
        participants: 'Lisa Farkas',
        text: 'Placed on hold pending budget approval from Finance. Revisit once the FY allocation is confirmed.',
      });
    }

    return {
      requester, requestDate: fmtDate(reqDate), term, executed, risk, description,
      documents: docs, comments, activity, approvals, lastActionISO, nextDueISO, meetings,
    };
  }

  window.CM = {
    STAGES, CATEGORIES, CONTRACTS, STAGE_ORDER, STAGE_STEP, STAGE_RANK,
    REVIEW_STAGES, EXTERNAL_STAGES, EXCEPTION_STAGES, CLOSED_STAGES, REVIEWERS,
    VENDORS, VENDOR_BADGE, VENDOR_STATUS_ORDER,
    buildDetail, actionDates,
    USER: { name: 'Lisa Farkas', role: 'Procurement' },
  };
})();
