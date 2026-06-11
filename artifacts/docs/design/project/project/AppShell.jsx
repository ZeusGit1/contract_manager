// AppShell — Contract Manager frame: navy sidebar + lockup + top bar + content.
const { useState, useEffect } = React;
const { IconButton, Avatar, Breadcrumb } = window.McDermottDesignSystem_b80d20;

const SYMBOL = (
  <svg viewBox="0 0 171.84 171.84" fill="currentColor" aria-label="McDermott" style={{ width: '100%', height: '100%' }}>
    <path d="M43,85.12l22.6,36.87h-22.6v-36.87ZM113.34,121.9h16.81V47.95h-16.81v73.95ZM42.17,47.95l47.09,76.79,8.38-20.04-34.79-56.75h-20.67ZM171.84,85.92c0,47.37-38.55,85.92-85.92,85.92S0,133.29,0,85.92,38.55,0,85.92,0s85.92,38.55,85.92,85.92ZM162.77,85.92c0-42.37-34.47-76.85-76.85-76.85S9.07,43.55,9.07,85.92s34.47,76.85,76.85,76.85,76.85-34.47,76.85-76.85Z"/>
  </svg>
);

function Lockup({ appName }) {
  return (
    <span className="lockup">
      <span className="lockup__symbol">{SYMBOL}</span>
      <span className="lockup__divider" aria-hidden="true"></span>
      <span className="lockup__name">{appName}</span>
    </span>
  );
}

// Primary nav (in prototype) + onward links (out of prototype scope, still shown).
const NAV_MAIN = [
  { id: 'dashboard', label: 'Active contracts', icon: 'squares-four' },
  { id: 'vendors', label: 'Vendors', icon: 'buildings' },
];
const NAV_ACTIONS = [
  { id: 'intake', label: 'New contract', icon: 'plus-circle' },
  { id: 'bulk', label: 'Bulk upload', icon: 'upload-simple' },
];
const NAV_MORE = [
  { id: 'archive', label: 'Archive', icon: 'archive', ext: true },
  { id: 'renewals', label: 'Renewal report', icon: 'calendar-check', ext: true },
  { id: 'settings', label: 'Settings', icon: 'gear', ext: true },
];

function NavItem({ item, section, onNavigate, setDrawer }) {
  const active = section === item.id;
  return (
    <li>
      <button
        className={`shell-nav__item${active ? ' is-active' : ''}${item.ext ? ' shell-nav__ext' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => { onNavigate && onNavigate(item.id); setDrawer(false); }}
      >
        <i className={`ph ph-${item.icon}`} aria-hidden="true"></i>
        <span>{item.label}</span>
        {item.count ? <span className="nav-count">{item.count}</span> : null}
      </button>
    </li>
  );
}

function AppShell({ appName = 'Contract Manager', section, onNavigate, breadcrumb = [], onBreadcrumb, actions, theme, onToggleTheme, navCount, children }) {
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setDrawer(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const user = (window.CM && window.CM.USER) || { name: 'Lisa Farkas', role: 'Procurement' };

  const sidebar = (
    <nav className="shell-sidebar" aria-label="Primary">
      <div className="shell-sidebar__head">
        <Lockup appName={appName} />
      </div>
      <ul className="shell-nav">
        {NAV_MAIN.map((item) => <NavItem key={item.id} item={item.id === 'dashboard' && navCount != null ? { ...item, count: String(navCount) } : item} section={section} onNavigate={onNavigate} setDrawer={setDrawer} />)}
        <li className="shell-nav__section">Create</li>
        {NAV_ACTIONS.map((item) => <NavItem key={item.id} item={item} section={section} onNavigate={onNavigate} setDrawer={setDrawer} />)}
        <li className="shell-nav__section">More</li>
        {NAV_MORE.map((item) => <NavItem key={item.id} item={item} section={section} onNavigate={onNavigate} setDrawer={setDrawer} />)}
      </ul>
      <div className="shell-sidebar__pinned">
        <Avatar name={user.name} size="sm" />
        <div className="shell-user">
          <span className="shell-user__name">{user.name}</span>
          <span className="shell-user__role">{user.role}</span>
        </div>
        <button className="shell-user__menu" aria-label="Account menu"><i className="ph ph-caret-up-down" aria-hidden="true"></i></button>
      </div>
    </nav>
  );

  return (
    <div className="shell">
      <aside className="shell-sidebar-slot">{sidebar}</aside>
      {drawer ? <div className="shell-scrim" onClick={() => setDrawer(false)}></div> : null}
      <aside className={`shell-drawer${drawer ? ' is-open' : ''}`}>{sidebar}</aside>

      <div className="shell-body">
        <header className="shell-topbar">
          <div className="shell-topbar__left">
            <button className="shell-hamburger" aria-label="Open navigation" onClick={() => setDrawer(true)}>
              <i className="ph ph-list" aria-hidden="true"></i>
            </button>
            <Breadcrumb items={breadcrumb} onNavigate={onBreadcrumb} />
          </div>
          <div className="shell-topbar__right">
            {actions}
            <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} aria-label="Toggle theme" onClick={onToggleTheme} />
            <Avatar name={user.name} size="sm" />
          </div>
        </header>
        <main className="shell-main">{children}</main>
      </div>
    </div>
  );
}

window.AppShell = AppShell;
