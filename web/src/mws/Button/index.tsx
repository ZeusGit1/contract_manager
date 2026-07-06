import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
}

/** McDermott button — never wraps labels. Variants follow _core-requirements.md.
 *  `icon` accepts a Phosphor regular icon name (e.g. "plus", "paper-plane-tilt"). */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className ?? ''}`}
      {...rest}
    >
      {icon ? <i className={`ph ph-${icon}`} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
