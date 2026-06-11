import styles from './Lockup.module.css';

interface LockupProps {
  appName: string;
}

/** McDermott lockup — official symbol SVG (M-in-circle) + divider + Title-Case app name in Georgia.
 *  See .claude/rules/design/application-lockup.md — the symbol uses fill="currentColor" so it inherits
 *  the surface color. On the navy sidebar the whole lockup paints white. */
export function Lockup({ appName }: LockupProps) {
  return (
    <span className={styles.lockup}>
      <span className={styles.symbol}>
        <svg
          viewBox="0 0 171.84 171.84"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          role="img"
          aria-label="McDermott"
        >
          <path d="M43,85.12l22.6,36.87h-22.6v-36.87ZM113.34,121.9h16.81V47.95h-16.81v73.95ZM42.17,47.95l47.09,76.79,8.38-20.04-34.79-56.75h-20.67ZM171.84,85.92c0,47.37-38.55,85.92-85.92,85.92S0,133.29,0,85.92,38.55,0,85.92,0s85.92,38.55,85.92,85.92ZM162.77,85.92c0-42.37-34.47-76.85-76.85-76.85S9.07,43.55,9.07,85.92s34.47,76.85,76.85,76.85,76.85-34.47,76.85-76.85Z" />
        </svg>
      </span>
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.name}>{appName}</span>
    </span>
  );
}
