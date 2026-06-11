import { ContractTable } from '@/components/ContractTable';
import { useContractList } from './hooks';
import styles from './ListScreen.module.css';

export function MyReviewsScreen() {
  // Server filters via IContractAccess — AttorneyReviewers only see assigned contracts.
  const listQuery = useContractList({});

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>My reviews</h1>
        <p className={styles.subtitle}>Contracts assigned to you for review.</p>
      </header>
      <ContractTable
        rows={listQuery.data?.items ?? []}
        isLoading={listQuery.isLoading}
        error={listQuery.error as Error | null}
        emptyMessage="You have no contracts assigned for review."
      />
    </div>
  );
}
