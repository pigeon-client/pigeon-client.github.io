import { type ApiResponse, EMPTY_BODY, utf8Bytes, utf8Text } from "@/core/http";
import { isBinaryMime } from "@/shared/lib/contentType";
import type { HistoryItem, ResponseSnapshot } from "../types";

/** Text-response snapshot cap — matches the launch-plan's 256KB budget per entry. */
export const SNAPSHOT_CAP_BYTES = 256 * 1024;

/** Structural subset of `ApiResponse` — keeps this module decoupled from the full shape. */
export interface SnapshotSource {
  status: number;
  statusText: string;
  contentType: string;
  size: number;
  body: Uint8Array;
}

/**
 * Build a history snapshot from a just-sent response. Binary/media content types
 * store metadata only (no body); text bodies over the cap are truncated with a
 * flag rather than dropped or stored unbounded.
 */
export function buildSnapshot(response: SnapshotSource): ResponseSnapshot {
  const base = {
    status: response.status,
    statusText: response.statusText,
    contentType: response.contentType,
    size: response.size,
  };

  if (isBinaryMime(response.contentType)) {
    return { ...base, truncated: false };
  }

  const bytes = response.body;
  if (bytes.length <= SNAPSHOT_CAP_BYTES) {
    return { ...base, bodyText: utf8Text(bytes), truncated: false };
  }

  // TextDecoder handles a truncated multi-byte sequence at the cut point gracefully
  // (replacement character), so this never throws on non-ASCII content.
  const truncatedBytes = bytes.slice(0, SNAPSHOT_CAP_BYTES);
  return {
    ...base,
    bodyText: utf8Text(truncatedBytes),
    truncated: true,
  };
}

/** Render a history entry's snapshot in the response viewer without re-sending. */
export function snapshotToApiResponse(item: HistoryItem): ApiResponse | null {
  const snap = item.snapshot;
  if (!snap) return null;
  const bodyBytes = snap.bodyText ? utf8Bytes(snap.bodyText) : EMPTY_BODY;
  return {
    status: snap.status,
    statusText: snap.statusText,
    headers: {},
    body: bodyBytes,
    contentType: snap.contentType,
    responseTime: item.responseTime,
    size: snap.size,
    resolvedUrl: item.url,
    sentHeaders: {},
    snapshotTimestamp: item.timestamp,
    snapshotTruncated: snap.truncated,
  };
}
