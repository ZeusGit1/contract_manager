import { Link } from 'react-router-dom';
import styles from './CategoryPickerScreen.module.css';

interface CategoryCard {
  to: string;
  icon: string;
  label: string;
  description: string;
}

const CARDS: CategoryCard[] = [
  {
    to: '/new-contract/event',
    icon: 'ticket',
    label: 'Event',
    description:
      'Venues, AV, catering, hosted events. Use the event cost for this engagement only — never the whole conference.',
  },
  {
    to: '/new-contract/facilities',
    icon: 'wrench',
    label: 'Facilities',
    description:
      'Janitorial, property management, office furniture, records storage, building services.',
  },
  {
    to: '/new-contract',
    icon: 'desktop',
    label: 'IT',
    description: 'Software, SaaS, professional services with system access or AI involvement.',
  },
];

export function CategoryPickerScreen() {
  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>What kind of contract?</h1>
        <p className={styles.subtitle}>
          The category sets which fields Procurement needs and can&apos;t be changed after submit.
        </p>
      </header>
      <div className={styles.grid}>
        {CARDS.map((card) => (
          <Link key={card.to} to={card.to} className={styles.card}>
            <i className={`ph ph-${card.icon} ${styles.icon}`} aria-hidden="true" />
            <h2>{card.label}</h2>
            <p>{card.description}</p>
          </Link>
        ))}
      </div>
      <p className={styles.helper}>Not sure? Ask your Procurement contact.</p>
    </div>
  );
}
