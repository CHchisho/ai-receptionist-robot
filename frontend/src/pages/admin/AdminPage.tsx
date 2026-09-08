import { Link } from "react-router-dom";
import styles from "./AdminPage.module.css";

export function AdminPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Staff</p>
          <h1 className={styles.title}>Knowledge settings</h1>
        </div>
        <Link className={styles.back} to="/">
          Back to receptionist
        </Link>
      </header>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Sources</h2>
        <p className={styles.copy}>
          Content owners will add, review, and remove approved documents and URLs here.
          The ingestion pipeline is not connected yet.
        </p>
      </section>
    </main>
  );
}
