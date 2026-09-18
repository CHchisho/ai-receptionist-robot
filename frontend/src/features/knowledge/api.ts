import { http } from "@/shared/api/http";
import { env } from "@/shared/config/env";

export type KnowledgeSource = {
  source_id: string;
  title: string;
  kind: string;
  url: string | null;
  filename: string | null;
  chunk_count: number;
  stale: boolean;
  stale_reason: string | null;
};

export type KnowledgeChunk = {
  source_id: string;
  chunk_index: number;
  text: string;
};

export type KnowledgeStatus = {
  indexing: boolean;
  error: string | null;
};

export function listSources() {
  return http<{ items: KnowledgeSource[]; indexing: boolean }>("/api/v1/knowledge/sources");
}

export function knowledgeStatus() {
  return http<KnowledgeStatus>("/api/v1/knowledge/status");
}

export function addUrl(url: string, label?: string) {
  return http<KnowledgeSource>("/api/v1/knowledge/sources/url", {
    method: "POST",
    body: JSON.stringify({ url, label: label || null }),
  });
}

export function addFile(file: File, label?: string) {
  const body = new FormData();
  body.append("file", file);
  if (label) {
    body.append("label", label);
  }
  return http<KnowledgeSource>("/api/v1/knowledge/sources/file", {
    method: "POST",
    body,
  });
}

export function renameSource(sourceId: string, title: string) {
  return http<KnowledgeSource>("/api/v1/knowledge/sources", {
    method: "PATCH",
    body: JSON.stringify({ source_id: sourceId, title }),
  });
}

export function deleteSource(sourceId: string) {
  return http<{ ok: boolean }>(
    `/api/v1/knowledge/sources?source_id=${encodeURIComponent(sourceId)}`,
    { method: "DELETE" },
  );
}

export function listChunks(sourceId: string) {
  return http<{ items: KnowledgeChunk[] }>(
    `/api/v1/knowledge/chunks?source_id=${encodeURIComponent(sourceId)}`,
  );
}

export function reindexKnowledge() {
  return http<KnowledgeStatus>("/api/v1/knowledge/reindex", { method: "POST" });
}

export function fileUrl(sourceId: string) {
  return `${env.apiBaseUrl}/api/v1/knowledge/file?source_id=${encodeURIComponent(sourceId)}`;
}
