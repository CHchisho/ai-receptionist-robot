import { FormEvent, useEffect, useState } from "react";
import {
  addFile,
  addUrl,
  deleteSource,
  fileUrl,
  knowledgeStatus,
  listChunks,
  listSources,
  reindexKnowledge,
  renameSource,
  type KnowledgeChunk,
  type KnowledgeSource,
} from "@/features/knowledge/api";
import styles from "./SourcesPanel.module.css";

export function SourcesPanel() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [urlLabel, setUrlLabel] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const [openChunksId, setOpenChunksId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<KnowledgeSource | null>(null);
  const [reindexAfterDelete, setReindexAfterDelete] = useState(false);

  async function refresh() {
    const [list, status] = await Promise.all([listSources(), knowledgeStatus()]);
    setSources(list.items);
    setIndexing(list.indexing || status.indexing);
    if (status.error) {
      setError(status.error);
    }
  }

  useEffect(() => {
    refresh().catch(() => setError("Could not load sources."));
  }, []);

  useEffect(() => {
    if (!indexing) {
      return;
    }
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [indexing]);

  const staleCount = sources.filter((item) => item.stale).length;

  async function handleAddUrl(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await addUrl(url.trim(), urlLabel.trim() || undefined);
      setUrl("");
      setUrlLabel("");
      await refresh();
    } catch {
      setError("Could not add URL. Check that Qdrant is running.");
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    try {
      await addFile(file, fileLabel.trim() || undefined);
      input.value = "";
      setFileLabel("");
      await refresh();
    } catch {
      setError("Could not upload document.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    const source = pendingDelete;
    setError(null);
    try {
      await deleteSource(source.source_id);
      if (openChunksId === source.source_id) {
        setOpenChunksId(null);
        setChunks([]);
      }
      setPendingDelete(null);
      setReindexAfterDelete(true);
      await refresh();
    } catch {
      setError("Could not delete source.");
    }
  }

  async function handleReindex() {
    setError(null);
    setIndexing(true);
    setReindexAfterDelete(false);
    try {
      await reindexKnowledge();
      await refresh();
    } catch {
      setIndexing(false);
      setError("Could not start reindex.");
    }
  }

  async function handleToggleChunks(source: KnowledgeSource) {
    if (openChunksId === source.source_id) {
      setOpenChunksId(null);
      setChunks([]);
      return;
    }
    setError(null);
    try {
      const result = await listChunks(source.source_id);
      setOpenChunksId(source.source_id);
      setChunks(result.items);
    } catch {
      setError("Could not load indexed text.");
    }
  }

  async function saveLabel(sourceId: string) {
    const title = editingTitle.trim();
    if (!title) {
      return;
    }
    setError(null);
    try {
      await renameSource(sourceId, title);
      setEditingId(null);
      await refresh();
    } catch {
      setError("Could not update label.");
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Knowledge sources</h2>
          <p className={styles.copy}>Documents and URLs Lena can use in answers.</p>
        </div>
        <button className={styles.primary} type="button" onClick={handleReindex} disabled={indexing}>
          {indexing ? "Reindexing…" : "Reindex knowledge"}
        </button>
      </div>

      {indexing ? <p className={styles.progress}>Updating the search index…</p> : null}

      {staleCount > 0 ? (
        <p className={styles.banner}>
          {staleCount === 1 ? "1 source changed." : `${staleCount} sources changed.`} Reindex to apply.
        </p>
      ) : null}

      {reindexAfterDelete ? (
        <div className={styles.bannerRow}>
          <p className={styles.bannerText}>Source removed. Reindex remaining sources?</p>
          <button className={styles.primary} type="button" onClick={handleReindex} disabled={indexing}>
            Reindex now
          </button>
          <button className={styles.ghost} type="button" onClick={() => setReindexAfterDelete(false)}>
            Not now
          </button>
        </div>
      ) : null}

      <div className={styles.addBox}>
        <h3 className={styles.subhead}>Add URL</h3>
        <form className={styles.form} onSubmit={handleAddUrl}>
          <input
            className={styles.input}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            required
          />
          <input
            className={styles.input}
            value={urlLabel}
            onChange={(event) => setUrlLabel(event.target.value)}
            placeholder="Label"
          />
          <button className={styles.button} type="submit" disabled={indexing}>
            Add
          </button>
        </form>
        <h3 className={styles.subhead}>Add file</h3>
        <form className={styles.form} onSubmit={handleUpload}>
          <input className={styles.file} name="file" type="file" accept=".txt,.md,.pdf" required />
          <input
            className={styles.input}
            value={fileLabel}
            onChange={(event) => setFileLabel(event.target.value)}
            placeholder="Label"
          />
          <button className={styles.button} type="submit" disabled={indexing}>
            Upload
          </button>
        </form>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {sources.length === 0 ? (
        <p className={styles.copy}>No sources yet.</p>
      ) : (
        <ul className={styles.list}>
          {sources.map((source) => (
            <li
              key={source.source_id}
              className={source.stale ? `${styles.item} ${styles.stale}` : styles.item}
            >
              {editingId === source.source_id ? (
                <form
                  className={styles.rename}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveLabel(source.source_id);
                  }}
                >
                  <input
                    className={styles.input}
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    autoFocus
                  />
                  <button className={styles.button} type="submit">
                    Save
                  </button>
                  <button className={styles.ghost} type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <div className={styles.itemMain}>
                  <div className={styles.labelRow}>
                    <strong>{source.title}</strong>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label="Edit label"
                      onClick={() => {
                        setEditingId(source.source_id);
                        setEditingTitle(source.title);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.04a1 1 0 0 0 0-1.41l-2.51-2.51a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 2z"
                        />
                      </svg>
                    </button>
                  </div>
                  {source.kind === "url" && source.url ? (
                    <a className={styles.sourceLink} href={source.url} target="_blank" rel="noreferrer">
                      {source.url}
                    </a>
                  ) : source.filename ? (
                    <a
                      className={styles.sourceLink}
                      href={fileUrl(source.source_id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.filename}
                    </a>
                  ) : null}
                  <p className={styles.meta}>
                    {source.chunk_count} indexed pieces
                    {source.stale ? ` · ${source.stale_reason}` : ""}
                  </p>
                </div>
              )}

              {pendingDelete?.source_id === source.source_id ? (
                <div className={styles.confirm}>
                  <p>Delete “{source.title}”? This cannot be undone.</p>
                  <div className={styles.confirmActions}>
                    <button className={styles.danger} type="button" onClick={() => void confirmDelete()}>
                      Delete
                    </button>
                    <button className={styles.ghost} type="button" onClick={() => setPendingDelete(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.actions}>
                  <button type="button" className={styles.textBtn} onClick={() => void handleToggleChunks(source)}>
                    {openChunksId === source.source_id ? "Hide text" : "View indexed text"}
                  </button>
                  <button type="button" className={styles.textDanger} onClick={() => setPendingDelete(source)}>
                    Delete
                  </button>
                </div>
              )}

              {openChunksId === source.source_id ? (
                <div className={styles.chunks}>
                  <div className={styles.chunksHead}>
                    <h3 className={styles.chunksTitle}>Indexed text · {source.title}</h3>
                    <button type="button" className={styles.ghost} onClick={() => setOpenChunksId(null)}>
                      Close
                    </button>
                  </div>
                  {chunks.length === 0 ? (
                    <p className={styles.copy}>Nothing indexed for this source yet.</p>
                  ) : (
                    chunks.map((chunk) => (
                      <p key={chunk.chunk_index} className={styles.chunkText}>
                        {chunk.text}
                      </p>
                    ))
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
