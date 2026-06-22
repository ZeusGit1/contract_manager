import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Lockup } from '@/mws/Lockup';
import type { AppRole } from '@/types/contract';
import styles from './AppShell.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: AppRole[];
  /** Renders a small "Coming soon" pill on the nav entry (ADR-038). */
  comingSoon?: boolean;
}

const NAV_PRIMARY: NavItem[] = [
  {
    to: '/',
    label: 'My dashboard',
    icon: 'user-circle',
    roles: ['Procurement', 'ProcurementAdmin'],
  },
  {
    to: '/master',
    label: 'Master view',
    icon: 'squares-four',
    roles: ['Procurement', 'ProcurementAdmin'],
  },
  {
    to: '/my-submissions',
    label: 'My submissions',
    icon: 'list-checks',
    roles: ['Requester', 'Procurement', 'ProcurementAdmin'],
  },
  { to: '/my-reviews', label: 'My reviews', icon: 'eye', roles: ['AttorneyReviewer'] },
  {
    to: '/reports',
    label: 'Reports',
    icon: 'chart-bar',
    roles: ['Procurement', 'ProcurementAdmin'],
  },
  {
    to: '/vendors',
    label: 'Vendors',
    icon: 'buildings',
    roles: ['Procurement', 'ProcurementAdmin'],
  },
  {
    to: '/renewals',
    label: 'Renewals',
    icon: 'calendar-check',
    roles: ['Procurement', 'ProcurementAdmin'],
    comingSoon: true,
  },
];
const NAV_CREATE: NavItem[] = [
  {
    to: '/new-contract/category',
    label: 'New contract',
    icon: 'plus-circle',
    roles: ['Requester', 'Procurement', 'ProcurementAdmin'],
  },
  {
    to: '/bulk-upload',
    label: 'Bulk upload',
    icon: 'upload-simple',
    roles: ['Procurement', 'ProcurementAdmin'],
  },
];
const NAV_MORE: NavItem[] = [
  {
    to: '/archive',
    label: 'Completed / canceled',
    icon: 'archive-box',
    roles: ['Procurement', 'ProcurementAdmin'],
  },
  {
    // Categories admin is restricted to ProcurementAdmin per ADR-032 / ADR-037.
    to: '/settings/categories',
    label: 'Categories & fields',
    icon: 'gear',
    roles: ['ProcurementAdmin'],
  },
];

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userRoles: AppRole[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function AppShell({ children, userName, userRoles, theme, onToggleTheme }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Drawer closes via NavItemLink onClick + scrim click + Escape — no path-change effect needed.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filteredItems = (items: NavItem[]) =>
    items.filter((item) => item.roles.some((role) => userRoles.includes(role)));

  const sidebar = (
    <nav className={styles.sidebar} aria-label="Primary navigation">
      <div className={styles.sidebarHead}>
        <Lockup appName="Contract Manager" />
      </div>
      <ul className={styles.nav}>
        {filteredItems(NAV_PRIMARY).map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
        {filteredItems(NAV_CREATE).length > 0 ? <li className={styles.section}>Create</li> : null}
        {filteredItems(NAV_CREATE).map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
        {filteredItems(NAV_MORE).length > 0 ? <li className={styles.section}>More</li> : null}
        {filteredItems(NAV_MORE).map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </ul>
      <div className={styles.pinned}>
        <div aria-hidden="true" className={styles.avatar}>
          {userName.slice(0, 1).toUpperCase()}
        </div>
        <div className={styles.user}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole}>{userRoles[0] ?? 'Member'}</span>
        </div>
      </div>
    </nav>
  );

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebarSlot}>{sidebar}</aside>
      {drawerOpen ? (
        <div className={styles.scrim} aria-hidden="true" onClick={() => setDrawerOpen(false)} />
      ) : null}
      <aside className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}>{sidebar}</aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <button
            className={styles.hamburger}
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <i className="ph ph-list" aria-hidden="true" />
          </button>
          <div className={styles.topbarRight}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={onToggleTheme}
            >
              <i className={`ph ph-${theme === 'dark' ? 'sun' : 'moon'}`} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) =>
          isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
        }
      >
        <i className={`ph ph-${item.icon}`} aria-hidden="true" />
        <span>{item.label}</span>
        {item.comingSoon ? <span className={styles.comingSoon}>Soon</span> : null}
      </NavLink>
    </li>
  );
}
