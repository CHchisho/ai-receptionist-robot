import { Link } from "react-router-dom";
import { ChatPanel } from "@/features/conversation/components/ChatPanel";
import styles from "./ReceptionPage.module.css";

export function ReceptionPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Nokia Innovation Garage</p>
          <h1 className={styles.title}>Lena</h1>
        </div>
        <Link className={styles.adminLink} to="/admin">
          Admin
        </Link>
      </header>
      <ChatPanel />
    </main>
  );
}
