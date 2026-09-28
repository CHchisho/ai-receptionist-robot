import { http } from "@/shared/api/http";

export type DemoItem = {
  id: number;
  title: string;
  description: string;
  location: string;
  url: string | null;
  created_at: string;
};

export type EventItem = {
  id: number;
  title: string;
  event_time: string;
  room: string;
  description: string;
  created_at: string;
};

export type DemoDraft = {
  title: string;
  description: string;
  location: string;
  url: string | null;
};

export type EventDraft = {
  title: string;
  event_time: string;
  room: string;
  description: string;
};

export function listDemos() {
  return http<DemoItem[]>("/api/v1/content/demos");
}

export function createDemo(draft: DemoDraft) {
  return http<DemoItem>("/api/v1/content/demos", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateDemo(id: number, draft: DemoDraft) {
  return http<DemoItem>(`/api/v1/content/demos/${id}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

export function deleteDemo(id: number) {
  return http<{ deleted: boolean }>(`/api/v1/content/demos/${id}`, {
    method: "DELETE",
  });
}

export function listEvents() {
  return http<EventItem[]>("/api/v1/content/events");
}

export function createEvent(draft: EventDraft) {
  return http<EventItem>("/api/v1/content/events", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateEvent(id: number, draft: EventDraft) {
  return http<EventItem>(`/api/v1/content/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

export function deleteEvent(id: number) {
  return http<{ deleted: boolean }>(`/api/v1/content/events/${id}`, {
    method: "DELETE",
  });
}
