import { useMsal } from '@azure/msal-react';
import { Button } from '@/mws/Button';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import styles from './ProfileScreen.module.css';

export function ProfileScreen() {
  const me = useCurrentUser();
  const { instance } = useMsal();

  if (me.isLoading) return <p>Loading…</p>;
  if (me.error || !me.data) return <p>Couldn&apos;t load your profile.</p>;

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.subtitle}>
          Your firm directory record. Role membership is managed by IT in Entra.
        </p>
      </header>
      <dl className={styles.facts}>
        <div>
          <dt>Name</dt>
          <dd>{me.data.displayName}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{me.data.email}</dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{me.data.department ?? '—'}</dd>
        </div>
        <div>
          <dt>Roles</dt>
          <dd>{me.data.roles.join(', ') || 'No app roles assigned'}</dd>
        </div>
      </dl>
      <Button variant="secondary" onClick={() => void instance.logoutRedirect()}>
        Sign out
      </Button>
    </div>
  );
}
