import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HistoryPanel } from "@/features/history/HistoryPanel";
import { SourcesPanel } from "@/features/knowledge/SourcesPanel";
import styles from "./AdminPage.module.css";

type FeedbackItem = {
  id: number;
  rating: number;
  comment: string;
  session_id: string | null;
  created_at: string;
};

type DemoItem = {
  id: number;
  title: string;
  description: string;
  location: string;
  url: string | null;
  created_at: string;
};

type EventItem = {
  id: number;
  title: string;
  event_time: string;
  room: string;
  description: string;
  created_at: string;
};

type KioskMode = "chat" | "survey";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [demoTitle, setDemoTitle] = useState("");
  const [demoDescription, setDemoDescription] = useState("");
  const [demoLocation, setDemoLocation] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [demoError, setDemoError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventRoom, setEventRoom] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventError, setEventError] = useState<string | null>(null);

  const [kioskMode, setKioskMode] = useState<KioskMode>("chat");
  const [kioskError, setKioskError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/kiosk/mode")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load kiosk mode");
        }
        return response.json();
      })
      .then((data: { mode: KioskMode }) => {
        setKioskMode(data.mode);
        setKioskError(null);
      })
      .catch(() => {
        setKioskError("Could not load reception mode.");
      });

    fetch("/api/v1/feedback")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load feedback");
        }
        return response.json();
      })
      .then((data: FeedbackItem[]) => {
        setFeedback(data);
        setFeedbackError(null);
      })
      .catch(() => {
        setFeedbackError("Could not load visitor feedback.");
      });
  }, []);

  useEffect(() => {
    fetch("/api/v1/content/demos")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load demos");
        }
        return response.json();
      })
      .then((data: DemoItem[]) => {
        setDemos(data);
        setDemoError(null);
      })
      .catch(() => {
        setDemoError("Could not load demos.");
      });
  }, []);

  useEffect(() => {
    fetch("/api/v1/content/events")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load events");
        }
        return response.json();
      })
      .then((data: EventItem[]) => {
        setEvents(data);
        setEventError(null);
      })
      .catch(() => {
        setEventError("Could not load events.");
      });
  }, []);

  async function addDemo() {
    setDemoError(null);

    try {
      const response = await fetch("/api/v1/content/demos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: demoTitle,
          description: demoDescription,
          location: demoLocation,
          url: demoUrl || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add demo");
      }

      const created: DemoItem = await response.json();

      setDemos((current) => [created, ...current]);
      setDemoTitle("");
      setDemoDescription("");
      setDemoLocation("");
      setDemoUrl("");
    } catch {
      setDemoError("Could not add demo.");
    }
  }

  async function deleteDemo(id: number) {
    setDemoError(null);

    try {
      const response = await fetch(`/api/v1/content/demos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete demo");
      }

      setDemos((current) => current.filter((demo) => demo.id !== id));
    } catch {
      setDemoError("Could not delete demo.");
    }
  }

  async function addEvent() {
    setEventError(null);

    try {
      const response = await fetch("/api/v1/content/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: eventTitle,
          event_time: eventTime,
          room: eventRoom,
          description: eventDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add event");
      }

      const created: EventItem = await response.json();

      setEvents((current) => [created, ...current]);
      setEventTitle("");
      setEventTime("");
      setEventRoom("");
      setEventDescription("");
    } catch {
      setEventError("Could not add event.");
    }
  }

  async function deleteEvent(id: number) {
    setEventError(null);

    try {
      const response = await fetch(`/api/v1/content/events/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      setEvents((current) => current.filter((event) => event.id !== id));
    } catch {
      setEventError("Could not delete event.");
    }
  }

  function updateKioskMode(mode: KioskMode) {
    fetch("/api/v1/kiosk/mode", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update kiosk mode");
        }
        return response.json();
      })
      .then((data: { mode: KioskMode }) => {
        setKioskMode(data.mode);
        setKioskError(null);
      })
      .catch(() => {
        setKioskError("Could not update reception mode.");
      });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Staff</p>
          <h1 className={styles.title}>Admin</h1>
        </div>
        <Link className={styles.back} to="/">
          Back to receptionist
        </Link>
      </header>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Reception mode</h2>
        <p className={styles.copy}>
          Choose what visitors see on the reception tablet.
        </p>

        <div className={styles.modeButtons}>
          <button
            type="button"
            className={kioskMode === "chat" ? styles.activeMode : styles.modeButton}
            onClick={() => updateKioskMode("chat")}
          >
            Chat
          </button>

          <button
            type="button"
            className={kioskMode === "survey" ? styles.activeMode : styles.modeButton}
            onClick={() => updateKioskMode("survey")}
          >
            Survey
          </button>
        </div>

        {kioskError ? <p className={styles.error}>{kioskError}</p> : null}
      </section>
      <div className={styles.grid}>
        <SourcesPanel />
        <div className={styles.side}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Demos</h2>
            <p className={styles.copy}>
              Add and manage demos available to visitors.
            </p>

            <input
              value={demoTitle}
              onChange={(event) => setDemoTitle(event.target.value)}
              placeholder="Title"
            />

            <input
              value={demoDescription}
              onChange={(event) => setDemoDescription(event.target.value)}
              placeholder="Short description"
            />

            <input
              value={demoLocation}
              onChange={(event) => setDemoLocation(event.target.value)}
              placeholder="Location in hall"
            />

            <input
              value={demoUrl}
              onChange={(event) => setDemoUrl(event.target.value)}
              placeholder="Optional link"
            />

            <button type="button" onClick={addDemo}>
              Add demo
            </button>

            {demoError ? <p className={styles.error}>{demoError}</p> : null}

            <ul className={styles.list}>
              {demos.map((demo) => (
                <li key={demo.id} className={styles.item}>
                  <strong>{demo.title}</strong>
                  <p>{demo.description}</p>
                  <span className={styles.meta}>{demo.location}</span>

                  <button type="button" onClick={() => deleteDemo(demo.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Events</h2>
            <p className={styles.copy}>
              Add and manage current events for visitors.
            </p>

            <input
              value={eventTitle}
              onChange={(event) => setEventTitle(event.target.value)}
              placeholder="Title"
            />

            <input
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
              placeholder="Time"
            />

            <input
              value={eventRoom}
              onChange={(event) => setEventRoom(event.target.value)}
              placeholder="Room"
            />

            <input
              value={eventDescription}
              onChange={(event) => setEventDescription(event.target.value)}
              placeholder="Short description"
            />

            <button type="button" onClick={addEvent}>
              Add event
            </button>

            {eventError ? <p className={styles.error}>{eventError}</p> : null}

            <ul className={styles.list}>
              {events.map((event) => (
                <li key={event.id} className={styles.item}>
                  <strong>{event.title}</strong>
                  <p>{event.description}</p>
                  <span className={styles.meta}>
                    {event.event_time} · {event.room}
                  </span>

                  <button type="button" onClick={() => deleteEvent(event.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <HistoryPanel />
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Visitor feedback</h2>
            <p className={styles.copy}>Ratings and comments from the reception tablet.</p>
            {feedbackError ? <p className={styles.error}>{feedbackError}</p> : null}
            {!feedbackError && feedback.length === 0 ? (
              <p className={styles.copy}>No feedback yet.</p>
            ) : null}
            {feedback.length > 0 ? (
              <ul className={styles.list}>
                {feedback.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <strong>Rating: {item.rating}/5</strong>
                    <p>{item.comment || "No comment"}</p>
                    <span className={styles.meta}>
                      {item.session_id || "No session"} · {formatWhen(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
