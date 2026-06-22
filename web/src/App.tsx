import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';

import { AppShell } from '@/components/AppShell';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { ArchiveScreen } from '@/features/contracts/ArchiveScreen';
import { ContractDetailScreen } from '@/features/contracts/ContractDetailScreen';
import { DashboardScreen } from '@/features/contracts/DashboardScreen';
import { MyReviewsScreen } from '@/features/contracts/MyReviewsScreen';
import { MySubmissionsScreen } from '@/features/contracts/MySubmissionsScreen';
import { RenewalsScreen } from '@/features/contracts/RenewalsScreen';
import { ReportsScreen } from '@/features/contracts/ReportsScreen';
import { CategoryPickerScreen } from '@/features/intake/CategoryPickerScreen';
import { IntakeEventScreen } from '@/features/intake/IntakeEventScreen';
import { IntakeFacilitiesScreen } from '@/features/intake/IntakeFacilitiesScreen';
import { IntakeITScreen } from '@/features/intake/IntakeITScreen';
import { VendorMasterScreen } from '@/features/vendors/VendorMasterScreen';
import { BulkUploadScreen } from '@/features/bulk-upload/BulkUploadScreen';
import { CategoriesSettingsScreen } from '@/features/settings/CategoriesSettingsScreen';
import { ProfileScreen } from '@/features/settings/ProfileScreen';
import { ReminderSettingsScreen } from '@/features/settings/ReminderSettingsScreen';
import { Button } from '@/mws/Button';
import { Lockup } from '@/mws/Lockup';
import { apiTokenRequest } from '@/auth/msalConfig';

import styles from './App.module.css';

export function App() {
  return (
    <>
      <AuthenticatedTemplate>
        <AuthenticatedApp />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <SignInScreen />
      </UnauthenticatedTemplate>
    </>
  );
}

function AuthenticatedApp() {
  const me = useCurrentUser();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme-preference') as 'light' | 'dark') ?? 'light',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme-preference', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  if (me.isLoading) {
    return <div className={styles.bootMessage}>Loading…</div>;
  }
  if (me.error || !me.data) {
    return (
      <div className={styles.bootMessage}>
        <p>Couldn&apos;t load your profile. Refresh to retry.</p>
      </div>
    );
  }

  return (
    <AppShell
      userName={me.data.displayName}
      userRoles={me.data.roles}
      theme={theme}
      onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
    >
      <Routes>
        <Route path="/" element={<DashboardScreen view="mine" />} />
        <Route path="/master" element={<DashboardScreen view="master" />} />
        <Route path="/contracts/:contractId" element={<ContractDetailScreen />} />
        <Route path="/new-contract/category" element={<CategoryPickerScreen />} />
        <Route path="/new-contract" element={<IntakeITScreen />} />
        <Route path="/new-contract/event" element={<IntakeEventScreen />} />
        <Route path="/new-contract/facilities" element={<IntakeFacilitiesScreen />} />
        <Route path="/vendors" element={<VendorMasterScreen />} />
        <Route path="/bulk-upload" element={<BulkUploadScreen />} />
        <Route path="/my-submissions" element={<MySubmissionsScreen />} />
        <Route path="/my-reviews" element={<MyReviewsScreen />} />
        <Route path="/archive" element={<ArchiveScreen />} />
        <Route path="/renewals" element={<RenewalsScreen />} />
        <Route path="/reports" element={<ReportsScreen />} />
        <Route path="/settings/categories" element={<CategoriesSettingsScreen />} />
        <Route path="/settings/reminders" element={<ReminderSettingsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function SignInScreen() {
  const { instance } = useMsal();
  return (
    <div className={styles.signIn}>
      <Lockup appName="Contract Manager" />
      <h1 className={styles.title}>Sign in to continue</h1>
      <p className={styles.subtitle}>Authentication runs through your firm directory.</p>
      <Button onClick={() => void instance.loginRedirect(apiTokenRequest)}>
        Sign in with Entra
      </Button>
    </div>
  );
}
