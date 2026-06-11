import { Link } from 'react-router-dom';
import { Button } from '@/mws/Button';
import { ContractTable } from '@/components/ContractTable';
import { useContractList } from './hooks';
import styles from './ListScreen.module.css';

export function MySubmissionsScreen() {
  // Server filters by RequesterUserId via IContractAccess — Requesters only see their own.
  const listQuery = useContractList({});

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>My submissions</h1>
          <p className={styles.subtitle}>Contracts you&apos;ve submitted for Procurement review.</p>
        </div>
        <Link to="/new-contract/category">
          <Button icon="plus">New contract</Button>
        </Link>
      </header>
      <ContractTable
        rows={listQuery.data?.items ?? []}
        isLoading={listQuery.isLoading}
        error={listQuery.error as Error | null}
        emptyMessage="You haven't submitted any contracts yet. Start one with the New contract button."
      />
    </div>
  );
}
