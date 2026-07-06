import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
    // Phase 2 — schema is read-only in Phase 1; editing lands in Phase 2.
    to: '/settings/categories',
    label: 'Categories & fields',
    icon: 'gear',
    roles: ['ProcurementAdmin'],
    comingSoon: true,
  },
];

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userRoles: AppRole[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

export function AppShell({ children, userName, userRoles, theme, onToggleTheme }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Current page label — matched against the nav lists so the top bar's location anchor
  // stays in sync with the sidebar. Falls back to empty on routes not in a nav (e.g. /contracts/:id).
  const pageTitle = useMemo(() => {
    const all = [...NAV_PRIMARY, ...NAV_CREATE, ...NAV_MORE];
    if (location.pathname === '/') return 'My dashboard';
    const exact = all.find((item) => item.to === location.pathname);
    if (exact) return exact.label;
    const prefix = all
      .filter((item) => item.to !== '/')
      .find((item) => location.pathname.startsWith(item.to));
    return prefix?.label ?? '';
  }, [location.pathname]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Escape closes the drawer. Focus trap + focus-return handled in the dedicated effect below.
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen]);

  // Focus trap: on open, move focus into the drawer; on close, return focus to the hamburger.
  // Tab and Shift+Tab wrap within the drawer's focusable elements while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Snapshot the hamburger ref at effect-open so cleanup restores focus to the
    // element that was mounted when the drawer opened (react-hooks/exhaustive-deps).
    const hamburgerAtOpen = hamburgerRef.current;
    const focusables = drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusables[0]?.focus();

    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const active = drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (active.length === 0) {
        event.preventDefault();
        return;
      }
      const first = active[0];
      const last = active[active.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      // Restore focus to the hamburger — or wherever it came from — on close.
      const target = hamburgerAtOpen ?? previouslyFocused;
      target?.focus();
    };
  }, [drawerOpen]);

  const filteredItems = (items: NavItem[]) =>
    items.filter((item) => item.roles.some((role) => userRoles.includes(role)));

  const primaryItems = filteredItems(NAV_PRIMARY);
  const createItems = filteredItems(NAV_CREATE);
  const moreItems = filteredItems(NAV_MORE);

  const renderSidebar = (onLinkClick?: () => void) => (
    <nav className={styles.sidebar} aria-label="Primary navigation">
      <div className={styles.sidebarHead}>
        <Lockup appName="Contract Manager" />
      </div>
      <div className={styles.nav}>
        {primaryItems.length > 0 ? (
          <ul className={styles.navList}>
            {primaryItems.map((item) => (
              <NavItemLink key={item.to} item={item} onNavigate={onLinkClick} />
            ))}
          </ul>
        ) : null}
        {createItems.length > 0 ? (
          <>
            <h2 id="nav-create-heading" className={styles.section}>
              Create
            </h2>
            <ul className={styles.navList} aria-labelledby="nav-create-heading">
              {createItems.map((item) => (
                <NavItemLink key={item.to} item={item} onNavigate={onLinkClick} />
              ))}
            </ul>
          </>
        ) : null}
        {moreItems.length > 0 ? (
          <>
            <h2 id="nav-more-heading" className={styles.section}>
              More
            </h2>
            <ul className={styles.navList} aria-labelledby="nav-more-heading">
              {moreItems.map((item) => (
                <NavItemLink key={item.to} item={item} onNavigate={onLinkClick} />
              ))}
            </ul>
          </>
        ) : null}
      </div>
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
      <aside className={styles.sidebarSlot}>{renderSidebar()}</aside>
      {drawerOpen ? (
        <div className={styles.scrim} aria-hidden="true" onClick={closeDrawer} />
      ) : null}
      <aside
        id="nav-drawer"
        ref={drawerRef}
        className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal={drawerOpen ? 'true' : undefined}
        aria-label="Primary navigation"
        aria-hidden={drawerOpen ? undefined : 'true'}
      >
        {renderSidebar(closeDrawer)}
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              ref={hamburgerRef}
              className={styles.hamburger}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              aria-controls="nav-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <i className="ph ph-list" aria-hidden="true" />
            </button>
            {pageTitle ? <span className={styles.pageTitle}>{pageTitle}</span> : null}
          </div>
          <div className={styles.topbarRight}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={onToggleTheme}
            >
              <i className={`ph ph-${theme === 'dark' ? 'sun' : 'moon'}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={`Account · ${userName}`}
              onClick={() => navigate('/profile')}
            >
              <i className="ph ph-user-circle" aria-hidden="true" />
            </button>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

interface NavItemLinkProps {
  item: NavItem;
  onNavigate?: () => void;
}

function NavItemLink({ item, onNavigate }: NavItemLinkProps) {
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) =>
          isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
        }
        onClick={onNavigate}
      >
        <i className={`ph ph-${item.icon}`} aria-hidden="true" />
        <span>{item.label}</span>
        {item.comingSoon ? <span className={styles.comingSoon}>Soon</span> : null}
      </NavLink>
    </li>
  );
}
