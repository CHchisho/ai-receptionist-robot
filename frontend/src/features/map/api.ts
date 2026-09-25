import { http } from "@/shared/api/http";

export type MapLocation = {
  id: number;
  name: string;
  floor: string;
  landmark: string;
  directions: string;
  aliases: string[];
  sort_order: number;
};

export type LocationDraft = {
  name: string;
  floor: string;
  landmark: string;
  directions: string;
  aliases: string[];
};

export function listLocations() {
  return http<{ items: MapLocation[] }>("/api/v1/navigation/locations");
}

export function createLocation(draft: LocationDraft) {
  return http<MapLocation>("/api/v1/navigation/locations", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateLocation(id: number, draft: LocationDraft) {
  return http<MapLocation>(`/api/v1/navigation/locations/${id}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

export function moveLocation(id: number, direction: "up" | "down") {
  return http<MapLocation>(`/api/v1/navigation/locations/${id}/move`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
}

export function deleteLocation(id: number) {
  return http<{ ok: boolean }>(`/api/v1/navigation/locations/${id}`, {
    method: "DELETE",
  });
}
