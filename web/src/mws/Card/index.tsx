import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional eyebrow label (ALL CAPS, small, secondary). */
  eyebrow?: string;
  /** Optional Mix-serif title, 22pt. */
  title?: string;
  children: ReactNode;
}

/** McDermott surface — --bg-surface + 1px --border-light + 2px radius + --space-5 padding.
 *  Composes eyebrow / title / body. See _core-requirements.md "compose from tokens, don't invent". */
export function Card({ eyebrow, title, children, className, ...rest }: CardProps) {
  return (
    <div className={`${styles.card} ${className ?? ''}`} {...rest}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      {children}
    </div>
  );
}
