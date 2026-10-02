import { http } from "@/shared/api/http";
import { env } from "@/shared/config/env";

export const MAX_IMAGE_BYTES = 48 * 1024 * 1024;

export type DemoItem = {
  id: number;
  title: string;
  description: string;
  location: string;
  url: string | null;
  created_at: string;
  has_image: boolean;
  image_url: string | null;
  hidden: boolean;
};

export type EventItem = {
  id: number;
  title: string;
  event_time: string;
  room: string;
  description: string;
  created_at: string;
  has_image: boolean;
  image_url: string | null;
  hidden: boolean;
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

export function uploadDemoImage(id: number, file: File) {
  const body = new FormData();
  body.append("file", file);
  return http<DemoItem>(`/api/v1/content/demos/${id}/image`, {
    method: "PUT",
    body,
  });
}

export function setDemoHidden(id: number, hidden: boolean) {
  return http<DemoItem>(`/api/v1/content/demos/${id}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ hidden }),
  });
}

export function deleteDemoImage(id: number) {
  return http<DemoItem>(`/api/v1/content/demos/${id}/image`, {
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

export function uploadEventImage(id: number, file: File) {
  const body = new FormData();
  body.append("file", file);
  return http<EventItem>(`/api/v1/content/events/${id}/image`, {
    method: "PUT",
    body,
  });
}

export function setEventHidden(id: number, hidden: boolean) {
  return http<EventItem>(`/api/v1/content/events/${id}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ hidden }),
  });
}

export function deleteEventImage(id: number) {
  return http<EventItem>(`/api/v1/content/events/${id}/image`, {
    method: "DELETE",
  });
}

export function mediaSrc(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (/^(https?:|blob:|data:)/i.test(path)) {
    return path;
  }
  return `${env.apiBaseUrl}${path}`;
}
