import styles from "./LoadingState.module.css";

type Props = {
  label: string;
  variant?: "loading" | "error";
};

export default function LoadingState({
  label,
  variant = "loading",
}: Props) {
  if (variant === "error") {
    return (
      <div className={`${styles.container} ${styles.error}`} role="alert">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>We hit a snag</p>
          <h3>{label}</h3>
          <p>Please try again in a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} aria-busy="true" aria-live="polite">
      <div className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Preparing your workspace</p>
          <h3>{label}</h3>
          <p>Fetching the latest records and building the table view.</p>
        </div>

        <div className={styles.pills} aria-hidden="true">
          <span className={styles.pill} />
          <span className={`${styles.pill} ${styles.pillWide}`} />
          <span className={styles.pill} />
        </div>
      </div>

      <div className={styles.table} aria-hidden="true">
        <div className={styles.tableHead}>
          <span className={`${styles.line} ${styles.short}`} />
          <span className={`${styles.line} ${styles.medium}`} />
          <span className={`${styles.line} ${styles.medium}`} />
          <span className={`${styles.line} ${styles.short}`} />
        </div>

        <div className={styles.tableRow}>
          <span className={`${styles.line} ${styles.short}`} />
          <span className={`${styles.line} ${styles.medium}`} />
          <span className={`${styles.line} ${styles.medium}`} />
          <span className={`${styles.line} ${styles.short}`} />
        </div>

        <div className={styles.tableRow}>
          <span className={`${styles.line} ${styles.medium}`} />
          <span className={`${styles.line} ${styles.long}`} />
          <span className={`${styles.line} ${styles.medium}`} />
          <span className={`${styles.line} ${styles.short}`} />
        </div>

        <div className={styles.tableRow}>
          <span className={`${styles.line} ${styles.short}`} />
          <span className={`${styles.line} ${styles.medium}`} />
          <span className={`${styles.line} ${styles.long}`} />
          <span className={`${styles.line} ${styles.short}`} />
        </div>
      </div>
    </div>
  );
}
