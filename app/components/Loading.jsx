import styles from "./Loading.module.css";

export default function Loading({ message = "Loading..." }) {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingCard}>
        <h2 className={styles.loadingTitle}>TRACK DAILY</h2>
        <div className={styles.spinner}></div>
        <p className={styles.loadingMessage}>{message}</p>
      </div>
    </div>
  );
} 