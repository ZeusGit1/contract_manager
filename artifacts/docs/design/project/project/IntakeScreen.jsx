// IntakeScreen (S5) — IT contract intake. A Requester submits a Software or
// Professional-services contract for Procurement review. Submission is blocked
// until every required field for the chosen IT type is filled.
const { useState, useMemo } = React;
const { Badge, Button, Input, Select, Checkbox } = window.McDermottDesignSystem_b80d20;

const DEPLOYMENTS = ['SaaS (vendor-hosted)', 'On-premise', 'Hybrid'];
const HOSTING = ['United States', 'European Union', 'Other / multi-region'];
const ENGAGEMENTS = ['Fixed fee', 'Time & materials', 'Retainer'];

function YesNoField({ label, hint, value, onChange, error }) {
  return (
    <div className="ynfield">
      <span className="ynfield__label">{label}</span>
      {hint ? <span className="ynfield__hint">{hint}</span> : null}
      <div className="ynfield__opts" role="radiogroup" aria-label={label}>
        <Checkbox radio checked={value === true} onChange={() => onChange(true)} label="Yes" />
        <Checkbox radio checked={value === false} onChange={() => onChange(false)} label="No" />
      </div>
      {error ? <span className="field-error" role="alert">{error}</span> : null}
    </div>
  );
}

function IntakeScreen({ onSubmit, onCancel }) {
  const { CONTRACTS } = window.CM;
  const vendors = useMemo(() => Array.from(new Set(CONTRACTS.map((c) => c.vendor))).sort(), [CONTRACTS]);

  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [value, setValue] = useState('');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [description, setDescription] = useState('');

  const [itType, setItType] = useState('');
  // Software
  const [deployment, setDeployment] = useState('');
  const [seats, setSeats] = useState('');
  const [hosting, setHosting] = useState('');
  // Professional services
  const [engagement, setEngagement] = useState('');
  const [scope, setScope] = useState('');
  const [hours, setHours] = useState('');
  const [onsite, setOnsite] = useState(null);
  // Risk review
  const [personalData, setPersonalData] = useState(null);
  const [phi, setPhi] = useState(null);
  const [usesAI, setUsesAI] = useState(null);
  // Requester
  const [requester, setRequester] = useState('Lisa Farkas');

  const [attempted, setAttempted] = useState(false);

  const isNewVendor = vendor === '__new';
  const vendorName = isNewVendor ? newVendor.trim() : vendor;

  const errors = {};
  if (!title.trim()) errors.title = 'Enter a contract title.';
  if (!vendor) errors.vendor = 'Select a vendor.';
  else if (isNewVendor && !newVendor.trim()) errors.newVendor = 'Enter the new vendor name.';
  if (!value || Number(value) <= 0) errors.value = 'Enter the contract value.';
  if (!termStart) errors.termStart = 'Select a start date.';
  if (!termEnd) errors.termEnd = 'Select an end date.';
  else if (termStart && termEnd && termEnd < termStart) errors.termEnd = 'End date must be after the start date.';
  if (!itType) errors.itType = 'Choose the IT contract type.';
  if (itType === 'Software') {
    if (!deployment) errors.deployment = 'Select a deployment model.';
    if (!seats || Number(seats) <= 0) errors.seats = 'Enter the number of licenses.';
    if (!hosting) errors.hosting = 'Select a data-hosting region.';
  } else if (itType === 'Professional services') {
    if (!engagement) errors.engagement = 'Select an engagement type.';
    if (!scope.trim()) errors.scope = 'Summarize the scope of work.';
    if (!hours || Number(hours) <= 0) errors.hours = 'Enter the estimated hours.';
    if (onsite === null) errors.onsite = 'Specify whether on-site access is required.';
  }
  if (personalData === null) errors.personalData = 'Answer required.';
  if (phi === null) errors.phi = 'Answer required.';
  if (usesAI === null) errors.usesAI = 'Answer required.';
  if (!requester.trim()) errors.requester = 'Enter the requester name.';

  const e = attempted ? errors : {};
  const valid = Object.keys(errors).length === 0;

  // Live review routing — mirrors how approvals are assigned on the detail screen.
  const gates = ['GCO', 'InfoSec'];
  if (personalData || phi) gates.push('Privacy');

  const submit = () => {
    if (!valid) { setAttempted(true); window.scrollTo(0, 0); return; }
    const days = Math.round((new Date(termEnd + 'T00:00:00') - new Date(termStart + 'T00:00:00')) / 86400000);
    onSubmit({
      title: title.trim(),
      vendor: vendorName,
      value: Number(value),
      termDays: days,
      description: description.trim(),
      risk: {
        type: itType,
        personalData: !!personalData,
        phi: !!phi,
        usesAI: !!usesAI,
      },
      requester: requester.trim(),
    });
  };

  return (
    <div className="intake">
      <button className="back-link" onClick={onCancel}><i className="ph ph-arrow-left" aria-hidden="true"></i>Active contracts</button>

      <div className="page-head">
        <div>
          <p className="intake-eyebrow"><i className="ph ph-desktop" aria-hidden="true"></i>IT contract</p>
          <h1 className="page-head__title">New contract intake</h1>
          <p className="page-head__sub">Capture everything Procurement needs to begin review. Fields marked optional can be added later.</p>
        </div>
        <div className="page-head__actions">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" icon="paper-plane-tilt" onClick={submit}>Submit for review</Button>
        </div>
      </div>

      {attempted && !valid ? (
        <div className="intake-banner" role="alert">
          <i className="ph ph-warning-circle" aria-hidden="true"></i>
          <span>Some required fields still need attention. Review the highlighted fields below, then submit.</span>
        </div>
      ) : null}

      <div className="intake-grid">
        <form className="intake-form" onSubmit={(ev) => ev.preventDefault()}>
          <section className="intake-section">
            <h2 className="intake-section__title">Contract basics</h2>
            <div className="field-grid">
              <div className="field--full">
                <Input label="Contract title" placeholder="Relativity One — eDiscovery platform renewal"
                       value={title} onChange={(ev) => setTitle(ev.target.value)} error={e.title} />
              </div>
              <Select label="Vendor" placeholder="Select a vendor" value={vendor}
                      onChange={(ev) => setVendor(ev.target.value)}
                      options={[...vendors.map((v) => ({ value: v, label: v })), { value: '__new', label: 'Add a new vendor…' }]} />
              {isNewVendor ? (
                <Input label="New vendor name" placeholder="Acme Software, Inc."
                       value={newVendor} onChange={(ev) => setNewVendor(ev.target.value)} error={e.newVendor} />
              ) : <div className="field-spacer">{e.vendor ? <span className="field-error" role="alert">{e.vendor}</span> : null}</div>}
              <Input label="Contract value (USD)" type="number" min="0" placeholder="486000"
                     value={value} onChange={(ev) => setValue(ev.target.value)} error={e.value} />
              <div className="field-spacer"></div>
              <Input label="Term start" type="date" value={termStart} onChange={(ev) => setTermStart(ev.target.value)} error={e.termStart} />
              <Input label="Term end" type="date" value={termEnd} onChange={(ev) => setTermEnd(ev.target.value)} error={e.termEnd} />
              <div className="field--full">
                <Input label="Description" optional multiline placeholder="What is this contract for, and why now?"
                       value={description} onChange={(ev) => setDescription(ev.target.value)} />
              </div>
            </div>
          </section>

          <section className="intake-section">
            <h2 className="intake-section__title">IT classification</h2>
            <p className="intake-section__hint">The type determines which details Procurement needs before review.</p>
            <div className="type-choice" role="radiogroup" aria-label="IT contract type">
              {['Software', 'Professional services'].map((t) => (
                <button type="button" key={t}
                        className={`type-card${itType === t ? ' is-active' : ''}`}
                        aria-pressed={itType === t}
                        onClick={() => setItType(t)}>
                  <i className={`ph ph-${t === 'Software' ? 'app-window' : 'users-three'}`} aria-hidden="true"></i>
                  <span className="type-card__name">{t}</span>
                  <span className="type-card__desc">{t === 'Software' ? 'Licensed product, SaaS or on-premise.' : 'Consulting, staffing, or managed services.'}</span>
                </button>
              ))}
            </div>
            {e.itType ? <span className="field-error" role="alert">{e.itType}</span> : null}
          </section>

          {itType === 'Software' ? (
            <section className="intake-section">
              <h2 className="intake-section__title">Software details</h2>
              <div className="field-grid">
                <Select label="Deployment model" placeholder="Select a model" value={deployment}
                        onChange={(ev) => setDeployment(ev.target.value)} options={DEPLOYMENTS} />
                {e.deployment ? <div className="field-spacer"><span className="field-error" role="alert">{e.deployment}</span></div> : <div className="field-spacer"></div>}
                <Input label="Number of licenses" type="number" min="0" placeholder="250"
                       value={seats} onChange={(ev) => setSeats(ev.target.value)} error={e.seats} />
                <Select label="Data hosting region" placeholder="Select a region" value={hosting}
                        onChange={(ev) => setHosting(ev.target.value)} options={HOSTING} />
              </div>
              {e.hosting ? <span className="field-error" role="alert">{e.hosting}</span> : null}
            </section>
          ) : itType === 'Professional services' ? (
            <section className="intake-section">
              <h2 className="intake-section__title">Professional-services details</h2>
              <div className="field-grid">
                <Select label="Engagement type" placeholder="Select a type" value={engagement}
                        onChange={(ev) => setEngagement(ev.target.value)} options={ENGAGEMENTS} />
                <Input label="Estimated hours" type="number" min="0" placeholder="400"
                       value={hours} onChange={(ev) => setHours(ev.target.value)} error={e.hours} />
                <div className="field--full">
                  <Input label="Scope of work summary" multiline placeholder="What will the vendor deliver, and over what period?"
                         value={scope} onChange={(ev) => setScope(ev.target.value)} error={e.scope} />
                </div>
                <div className="field--full">
                  <YesNoField label="On-site access required?" value={onsite} onChange={setOnsite} error={e.onsite} />
                </div>
              </div>
            </section>
          ) : null}

          <section className="intake-section">
            <h2 className="intake-section__title">Risk review</h2>
            <p className="intake-section__hint">These answers route the contract to the right approval gates.</p>
            <div className="risk-grid">
              <YesNoField label="Accesses personal data?" hint="Names, contacts, or other PII." value={personalData} onChange={setPersonalData} error={e.personalData} />
              <YesNoField label="Accesses PHI?" hint="Protected health information." value={phi} onChange={setPhi} error={e.phi} />
              <YesNoField label="Uses AI?" hint="Generative or automated decisioning." value={usesAI} onChange={setUsesAI} error={e.usesAI} />
            </div>
          </section>

          <section className="intake-section">
            <h2 className="intake-section__title">Requester</h2>
            <div className="field-grid">
              <Input label="Requested by" value={requester} onChange={(ev) => setRequester(ev.target.value)} error={e.requester} />
              <div className="field-spacer"></div>
            </div>
          </section>
        </form>

        <aside className="intake-rail">
          <div className="rail-card">
            <p className="rail-card__eyebrow">On submit</p>
            <div className="submit-status">
              <Badge status="draft">In process</Badge>
              <span className="submit-status__txt">The contract joins the dashboard for Procurement to assign and review.</span>
            </div>
          </div>

          <div className="rail-card">
            <p className="rail-card__eyebrow">Review routing</p>
            <p className="routing-note">Based on the risk answers, this contract will require:</p>
            <div className="routing-gates">
              {gates.map((g) => (
                <span className="routing-gate" key={g}><i className="ph ph-check-circle" aria-hidden="true"></i>{g}</span>
              ))}
            </div>
            {!(personalData || phi) ? <p className="routing-hint">Answer “Yes” to personal data or PHI to add the Privacy gate.</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

window.IntakeScreen = IntakeScreen;
