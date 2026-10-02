import { FormEvent, useEffect, useState } from "react";
import {
  createDemo,
  createEvent,
  deleteDemo,
  deleteDemoImage,
  deleteEvent,
  deleteEventImage,
  listDemos,
  listEvents,
  setDemoHidden,
  setEventHidden,
  updateDemo,
  updateEvent,
  uploadDemoImage,
  uploadEventImage,
  type DemoDraft,
  type DemoItem,
  type EventDraft,
  type EventItem,
} from "@/features/content/api";
import { ApiError } from "@/shared/api/http";
import { IconEye, IconEyeSlash } from "@/shared/icons";
import { PhotoFrame } from "@/shared/photos/PhotoFrame";
import { EMPTY_PHOTO, PhotoPicker, type PhotoFields } from "@/shared/photos/PhotoPicker";
import styles from "./ContentPanel.module.css";

type DemoForm = PhotoFields & {
  title: string;
  description: string;
  location: string;
  url: string;
};

type EventForm = PhotoFields & {
  title: string;
  eventTime: string;
  room: string;
  description: string;
};

const EMPTY_DEMO: DemoForm = { title: "", description: "", location: "", url: "", ...EMPTY_PHOTO };
const EMPTY_EVENT: EventForm = { title: "", eventTime: "", room: "", description: "", ...EMPTY_PHOTO };

async function applyPhoto<T>(
  saved: T & { id: number },
  form: PhotoFields,
  upload: (id: number, file: File) => Promise<T>,
  clear: (id: number) => Promise<T>,
): Promise<T> {
  if (form.photoFile) {
    return upload(saved.id, form.photoFile);
  }
  if (form.photoRemoved && form.photoBaseline) {
    return clear(saved.id);
  }
  return saved;
}

function photoError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Could not save the photo.";
}

function demoDraft(form: DemoForm): DemoDraft {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim(),
    url: form.url.trim() || null,
  };
}

function eventDraft(form: EventForm): EventDraft {
  return {
    title: form.title.trim(),
    event_time: form.eventTime.trim(),
    room: form.room.trim(),
    description: form.description.trim(),
  };
}

export function ContentPanel() {
  return (
    <div className={styles.grid}>
      <DemoColumn />
      <EventColumn />
    </div>
  );
}

function DemoColumn() {
  const [items, setItems] = useState<DemoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DemoForm>(EMPTY_DEMO);
  const [pendingDelete, setPendingDelete] = useState<DemoItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listDemos()
      .then(setItems)
      .catch(() => setError("Could not load demos."));
  }, []);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setPendingDelete(null);
    setForm(EMPTY_DEMO);
    setError(null);
  }

  function startEdit(item: DemoItem) {
    setCreating(false);
    setEditingId(item.id);
    setPendingDelete(null);
    setForm({
      title: item.title,
      description: item.description,
      location: item.location,
      url: item.url ?? "",
      photoFile: null,
      photoRemoved: false,
      photoBaseline: item.image_url,
    });
    setError(null);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY_DEMO);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const draft = demoDraft(form);
      const saved =
        editingId !== null ? await updateDemo(editingId, draft) : await createDemo(draft);
      const remember = (item: DemoItem) => {
        setItems((current) => {
          const exists = current.some((entry) => entry.id === item.id);
          return exists ? current.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...current];
        });
      };
      remember(saved);
      try {
        remember(await applyPhoto(saved, form, uploadDemoImage, deleteDemoImage));
      } catch (error) {
        setCreating(false);
        setEditingId(saved.id);
        setForm((current) => ({ ...current, photoBaseline: saved.image_url }));
        setError(photoError(error));
        return;
      }
      cancelForm();
    } catch {
      setError("Could not save this demo. Fill in the name, what it is, and where it stands.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteDemo(pendingDelete.id);
      setItems((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch {
      setError("Could not delete this demo.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemovePhoto(item: DemoItem) {
    setSaving(true);
    setError(null);
    try {
      const updated = await deleteDemoImage(item.id);
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (error) {
      setError(photoError(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleHidden(item: DemoItem) {
    setSaving(true);
    setError(null);
    try {
      const updated = await setDemoHidden(item.id, !item.hidden);
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch {
      setError("Could not change visibility for this demo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Demos</h2>
          <p className={styles.copy}>
            Stands visitors can ask about. Lena opens a card only when the question includes the exact name.
          </p>
        </div>
        {creating ? null : (
          <button className={styles.primary} type="button" onClick={startCreate}>
            Add demo
          </button>
        )}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {creating ? (
        <DemoFormFields
          idPrefix="demo-new"
          form={form}
          saving={saving}
          submitLabel="Add demo"
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={cancelForm}
        />
      ) : null}

      {items.length === 0 && !creating ? <p className={styles.empty}>No demos yet.</p> : null}

      <ul className={styles.list}>
        {items.map((item) =>
          editingId === item.id ? (
            <li key={item.id} className={styles.item}>
              <DemoFormFields
                idPrefix={`demo-${item.id}`}
                form={form}
                saving={saving}
                submitLabel="Save changes"
                onChange={setForm}
                onSubmit={handleSubmit}
                onCancel={cancelForm}
              />
            </li>
          ) : (
            <li key={item.id} className={item.hidden ? `${styles.item} ${styles.itemHidden}` : styles.item}>
              <div className={styles.itemRow}>
                {item.image_url ? (
                  <PhotoFrame url={item.image_url} disabled={saving} onRemove={() => void confirmRemovePhoto(item)} />
                ) : null}
                <div className={styles.itemBody}>
                  <div>
                    <h3 className={styles.name}>{item.title}</h3>
                    <p className={styles.meta}>{item.location}</p>
                  </div>
                  <p className={styles.detail}>{item.description}</p>
                  {item.url ? (
                    <a className={styles.link} href={item.url} target="_blank" rel="noreferrer">
                      {item.url}
                    </a>
                  ) : null}
                  {pendingDelete?.id === item.id ? (
                    <div className={styles.confirm}>
                      <p>Delete “{item.title}”? Lena will stop answering about this stand.</p>
                      <div className={styles.formActions}>
                        <button className={styles.danger} type="button" disabled={saving} onClick={() => void confirmDelete()}>
                          Delete
                        </button>
                        <button className={styles.ghost} type="button" onClick={() => setPendingDelete(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.actions}>
                      <button type="button" className={styles.textBtn} onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        disabled={saving}
                        aria-label={
                          item.hidden
                            ? "Show again so Lena can use this item"
                            : "Hide from Lena. She will not use this item."
                        }
                        title={
                          item.hidden
                            ? "Show again so Lena can use this item"
                            : "Hide from Lena. She will not use this item."
                        }
                        onClick={() => void toggleHidden(item)}
                      >
                        {item.hidden ? <IconEye className={styles.icon} /> : <IconEyeSlash className={styles.icon} />}
                        {item.hidden ? "Show" : "Hide"}
                      </button>
                      <button type="button" className={styles.textDanger} onClick={() => setPendingDelete(item)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function EventColumn() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_EVENT);
  const [pendingDelete, setPendingDelete] = useState<EventItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listEvents()
      .then(setItems)
      .catch(() => setError("Could not load events."));
  }, []);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setPendingDelete(null);
    setForm(EMPTY_EVENT);
    setError(null);
  }

  function startEdit(item: EventItem) {
    setCreating(false);
    setEditingId(item.id);
    setPendingDelete(null);
    setForm({
      title: item.title,
      eventTime: item.event_time,
      room: item.room,
      description: item.description,
      photoFile: null,
      photoRemoved: false,
      photoBaseline: item.image_url,
    });
    setError(null);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY_EVENT);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const draft = eventDraft(form);
      const saved =
        editingId !== null ? await updateEvent(editingId, draft) : await createEvent(draft);
      const remember = (item: EventItem) => {
        setItems((current) => {
          const exists = current.some((entry) => entry.id === item.id);
          return exists ? current.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...current];
        });
      };
      remember(saved);
      try {
        remember(await applyPhoto(saved, form, uploadEventImage, deleteEventImage));
      } catch (error) {
        setCreating(false);
        setEditingId(saved.id);
        setForm((current) => ({ ...current, photoBaseline: saved.image_url }));
        setError(photoError(error));
        return;
      }
      cancelForm();
    } catch {
      setError("Could not save this event. Fill in the name, time, room, and what it is.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteEvent(pendingDelete.id);
      setItems((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch {
      setError("Could not delete this event.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemovePhoto(item: EventItem) {
    setSaving(true);
    setError(null);
    try {
      const updated = await deleteEventImage(item.id);
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (error) {
      setError(photoError(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleHidden(item: EventItem) {
    setSaving(true);
    setError(null);
    try {
      const updated = await setEventHidden(item.id, !item.hidden);
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch {
      setError("Could not change visibility for this event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Events</h2>
          <p className={styles.copy}>
            Workshops on the schedule. Lena opens a card only when the question includes the exact name.
          </p>
        </div>
        {creating ? null : (
          <button className={styles.primary} type="button" onClick={startCreate}>
            Add event
          </button>
        )}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {creating ? (
        <EventFormFields
          idPrefix="event-new"
          form={form}
          saving={saving}
          submitLabel="Add event"
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={cancelForm}
        />
      ) : null}

      {items.length === 0 && !creating ? <p className={styles.empty}>No events yet.</p> : null}

      <ul className={styles.list}>
        {items.map((item) =>
          editingId === item.id ? (
            <li key={item.id} className={styles.item}>
              <EventFormFields
                idPrefix={`event-${item.id}`}
                form={form}
                saving={saving}
                submitLabel="Save changes"
                onChange={setForm}
                onSubmit={handleSubmit}
                onCancel={cancelForm}
              />
            </li>
          ) : (
            <li key={item.id} className={item.hidden ? `${styles.item} ${styles.itemHidden}` : styles.item}>
              <div className={styles.itemRow}>
                {item.image_url ? (
                  <PhotoFrame url={item.image_url} disabled={saving} onRemove={() => void confirmRemovePhoto(item)} />
                ) : null}
                <div className={styles.itemBody}>
                  <div>
                    <h3 className={styles.name}>{item.title}</h3>
                    <p className={styles.meta}>
                      {item.event_time} · {item.room}
                    </p>
                  </div>
                  <p className={styles.detail}>{item.description}</p>
                  {pendingDelete?.id === item.id ? (
                    <div className={styles.confirm}>
                      <p>Delete “{item.title}”? Lena will stop answering about this event.</p>
                      <div className={styles.formActions}>
                        <button className={styles.danger} type="button" disabled={saving} onClick={() => void confirmDelete()}>
                          Delete
                        </button>
                        <button className={styles.ghost} type="button" onClick={() => setPendingDelete(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.actions}>
                      <button type="button" className={styles.textBtn} onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        disabled={saving}
                        aria-label={
                          item.hidden
                            ? "Show again so Lena can use this item"
                            : "Hide from Lena. She will not use this item."
                        }
                        title={
                          item.hidden
                            ? "Show again so Lena can use this item"
                            : "Hide from Lena. She will not use this item."
                        }
                        onClick={() => void toggleHidden(item)}
                      >
                        {item.hidden ? <IconEye className={styles.icon} /> : <IconEyeSlash className={styles.icon} />}
                        {item.hidden ? "Show" : "Hide"}
                      </button>
                      <button type="button" className={styles.textDanger} onClick={() => setPendingDelete(item)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function DemoFormFields({
  idPrefix,
  form,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  form: DemoForm;
  saving: boolean;
  submitLabel: string;
  onChange: (next: DemoForm) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  function update(field: keyof DemoForm, value: string) {
    onChange({ ...form, [field]: value });
  }

  return (
    <form className={styles.fields} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-title`}>Name on the stand</label>
        <input
          id={`${idPrefix}-title`}
          className={styles.input}
          value={form.title}
          onChange={(event) => update("title", event.target.value)}
          required
          maxLength={200}
        />
        <span className={styles.hint}>Visitors have to say this exact name. “Energy demo” will not match “Energy Management System”.</span>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-description`}>What Lena may say</label>
        <textarea
          id={`${idPrefix}-description`}
          className={styles.textarea}
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          required
          maxLength={2000}
        />
        <span className={styles.hint}>She answers only from this text and will not add facts that are not written here.</span>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-location`}>Where it stands</label>
        <input
          id={`${idPrefix}-location`}
          className={styles.input}
          value={form.location}
          onChange={(event) => update("location", event.target.value)}
          required
          maxLength={200}
          placeholder="Main Hall"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-url`}>Link for a QR code</label>
        <input
          id={`${idPrefix}-url`}
          className={styles.input}
          value={form.url}
          onChange={(event) => update("url", event.target.value)}
          maxLength={2000}
          placeholder="https://"
        />
        <span className={styles.hint}>Optional. Shown next to the answer when Lena talks about this demo.</span>
      </div>
      <PhotoPicker
        idPrefix={idPrefix}
        form={form}
        fieldClass={styles.field}
        fileClass={styles.file}
        hintClass={styles.hint}
        errorClass={styles.error}
        onChange={(photo) => onChange({ ...form, ...photo })}
      />
      <div className={styles.formActions}>
        <button className={styles.primary} type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        <button className={styles.ghost} type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function EventFormFields({
  idPrefix,
  form,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  form: EventForm;
  saving: boolean;
  submitLabel: string;
  onChange: (next: EventForm) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  function update(field: keyof EventForm, value: string) {
    onChange({ ...form, [field]: value });
  }

  return (
    <form className={styles.fields} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-title`}>Event name</label>
        <input
          id={`${idPrefix}-title`}
          className={styles.input}
          value={form.title}
          onChange={(event) => update("title", event.target.value)}
          required
          maxLength={200}
        />
        <span className={styles.hint}>Visitors have to say this exact name for Lena to open the card.</span>
      </div>
      <div className={styles.pair}>
        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-time`}>When</label>
          <input
            id={`${idPrefix}-time`}
            className={styles.input}
            value={form.eventTime}
            onChange={(event) => update("eventTime", event.target.value)}
            required
            maxLength={80}
            placeholder="14:00"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-room`}>Room</label>
          <input
            id={`${idPrefix}-room`}
            className={styles.input}
            value={form.room}
            onChange={(event) => update("room", event.target.value)}
            required
            maxLength={200}
            placeholder="Room 201"
          />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-description`}>What it is</label>
        <textarea
          id={`${idPrefix}-description`}
          className={styles.textarea}
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          required
          maxLength={2000}
        />
        <span className={styles.hint}>Time and room are shown on the card. This text is what Lena is allowed to say.</span>
      </div>
      <PhotoPicker
        idPrefix={idPrefix}
        form={form}
        fieldClass={styles.field}
        fileClass={styles.file}
        hintClass={styles.hint}
        errorClass={styles.error}
        onChange={(photo) => onChange({ ...form, ...photo })}
      />
      <div className={styles.formActions}>
        <button className={styles.primary} type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        <button className={styles.ghost} type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
