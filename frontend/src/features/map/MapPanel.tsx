import { FormEvent, useEffect, useState } from "react";
import {
  createLocation,
  deleteLocation,
  listLocations,
  moveLocation,
  updateLocation,
  type LocationDraft,
  type MapLocation,
} from "@/features/map/api";
import styles from "./MapPanel.module.css";

type FormState = {
  name: string;
  floor: string;
  landmark: string;
  directions: string;
  aliases: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  floor: "",
  landmark: "",
  directions: "",
  aliases: "",
};

function toForm(location: MapLocation): FormState {
  return {
    name: location.name,
    floor: location.floor,
    landmark: location.landmark,
    directions: location.directions,
    aliases: location.aliases.join(", "),
  };
}

function toDraft(form: FormState): LocationDraft {
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const part of form.aliases.split(",")) {
    const alias = part.trim().toLowerCase().replace(/\s+/g, " ");
    if (!alias || seen.has(alias)) {
      continue;
    }
    seen.add(alias);
    aliases.push(alias);
  }
  return {
    name: form.name.trim(),
    floor: form.floor.trim(),
    landmark: form.landmark.trim(),
    directions: form.directions.trim(),
    aliases,
  };
}

export function MapPanel() {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<MapLocation | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const result = await listLocations();
    setLocations(result.items);
  }

  useEffect(() => {
    refresh().catch(() => setError("Could not load the map."));
  }, []);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setPendingDelete(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(location: MapLocation) {
    setCreating(false);
    setEditingId(location.id);
    setPendingDelete(null);
    setForm(toForm(location));
    setError(null);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const draft = toDraft(form);
      if (editingId !== null) {
        await updateLocation(editingId, draft);
      } else {
        await createLocation(draft);
      }
      cancelForm();
      await refresh();
    } catch {
      setError("Could not save this place. Fill in name, floor, landmark, and directions.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(location: MapLocation, direction: "up" | "down") {
    setError(null);
    try {
      await moveLocation(location.id, direction);
      await refresh();
    } catch {
      setError("Could not reorder places.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteLocation(pendingDelete.id);
      if (editingId === pendingDelete.id) {
        cancelForm();
      }
      setPendingDelete(null);
      await refresh();
    } catch {
      setError("Could not delete this place.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Indoor map</h2>
          <p className={styles.copy}>
            Places Lena can direct visitors to. The place name is always recognized. Earlier places win when phrases overlap.
          </p>
        </div>
        <button className={styles.primary} type="button" onClick={startCreate} disabled={creating}>
          Add place
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {creating ? (
        <div className={styles.item}>
          <LocationForm
            form={form}
            saving={saving}
            submitLabel="Add place"
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={cancelForm}
          />
        </div>
      ) : null}

      {locations.length === 0 && !creating ? <p className={styles.copy}>No places yet.</p> : null}

      <ul className={styles.list}>
        {locations.map((location, index) =>
          editingId === location.id ? (
            <li key={location.id} className={styles.item}>
              <LocationForm
                form={form}
                saving={saving}
                submitLabel="Save changes"
                onChange={setForm}
                onSubmit={handleSubmit}
                onCancel={cancelForm}
              />
            </li>
          ) : (
            <li key={location.id} className={styles.item}>
              <div className={styles.itemHead}>
                <div>
                  <h3 className={styles.name}>{location.name}</h3>
                  <p className={styles.floor}>{location.floor}</p>
                </div>
                <div className={styles.order}>
                  <button
                    type="button"
                    aria-label={`Move ${location.name} up`}
                    disabled={index === 0 || saving}
                    onClick={() => void handleMove(location, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${location.name} down`}
                    disabled={index === locations.length - 1 || saving}
                    onClick={() => void handleMove(location, "down")}
                  >
                    ↓
                  </button>
                </div>
              </div>
              <p className={styles.detail}>
                <span>Landmark. </span>
                {location.landmark}
              </p>
              <p className={styles.detail}>{location.directions}</p>
              {location.aliases.length > 0 ? (
                <ul className={styles.aliases} aria-label={`Phrases for ${location.name}`}>
                  {location.aliases.map((alias) => (
                    <li key={alias} className={styles.alias}>
                      {alias}
                    </li>
                  ))}
                </ul>
              ) : null}
              {pendingDelete?.id === location.id ? (
                <div className={styles.confirm}>
                  <p>Delete “{location.name}”? Lena will stop giving directions to it.</p>
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
                  <button type="button" className={styles.textBtn} onClick={() => startEdit(location)}>
                    Edit
                  </button>
                  <button type="button" className={styles.textDanger} onClick={() => setPendingDelete(location)}>
                    Delete
                  </button>
                </div>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function LocationForm({
  form,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  saving: boolean;
  submitLabel: string;
  onChange: (next: FormState) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  function update(field: keyof FormState, value: string) {
    onChange({ ...form, [field]: value });
  }

  return (
    <form className={styles.fields} onSubmit={onSubmit}>
      <div className={styles.pair}>
        <div className={styles.field}>
          <label htmlFor="place-name">Name</label>
          <input
            id="place-name"
            className={styles.input}
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="place-floor">Floor</label>
          <input
            id="place-floor"
            className={styles.input}
            value={form.floor}
            onChange={(event) => update("floor", event.target.value)}
            required
            maxLength={120}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="place-landmark">Landmark</label>
        <input
          id="place-landmark"
          className={styles.input}
          value={form.landmark}
          onChange={(event) => update("landmark", event.target.value)}
          required
          maxLength={300}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="place-directions">Directions</label>
        <textarea
          id="place-directions"
          className={styles.textarea}
          value={form.directions}
          onChange={(event) => update("directions", event.target.value)}
          required
          maxLength={2000}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="place-aliases">Phrases visitors might say</label>
        <input
          id="place-aliases"
          className={styles.input}
          value={form.aliases}
          onChange={(event) => update("aliases", event.target.value)}
          placeholder="kitchen, coffee, tea"
        />
        <span className={styles.hint}>Separate phrases with commas. The place name is matched even if it is not listed here.</span>
      </div>
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
