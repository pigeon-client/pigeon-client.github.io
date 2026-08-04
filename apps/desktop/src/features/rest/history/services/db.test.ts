import { describe, expect, it } from "vitest";
import type { HistoryItem } from "../types";
import { isQuotaError, stripOldestSnapshots } from "./db";

function row(id: number, withSnapshot: boolean): { id: number; data: HistoryItem } {
  return {
    id,
    data: {
      name: `r${id}`,
      method: "GET",
      url: `https://example.com/${id}`,
      statusCode: 200,
      responseTime: 5,
      timestamp: id,
      // biome-ignore lint/suspicious/noExplicitAny: minimal RequestConfig stand-in for this test
      request: {} as any,
      snapshot: withSnapshot
        ? {
            status: 200,
            statusText: "OK",
            contentType: "application/json",
            size: 2,
            bodyText: "{}",
            truncated: false,
          }
        : undefined,
    },
  };
}

describe("stripOldestSnapshots", () => {
  it("drops snapshots from the oldest (lowest-id) half, keeps the rest untouched", () => {
    const rows = [row(1, true), row(2, true), row(3, true), row(4, true)];
    const result = stripOldestSnapshots(rows);
    expect(result.map((r) => [r.id, Boolean(r.data.snapshot)])).toEqual([
      [1, false],
      [2, false],
      [3, true],
      [4, true],
    ]);
  });

  it("is a no-op when nothing has a snapshot", () => {
    const rows = [row(1, false), row(2, false)];
    expect(stripOldestSnapshots(rows)).toEqual(rows);
  });

  it("still strips at least one row when there's only a single snapshot", () => {
    const rows = [row(1, true)];
    const result = stripOldestSnapshots(rows);
    expect(result[0].data.snapshot).toBeUndefined();
  });
});

describe("isQuotaError", () => {
  it("recognizes a QuotaExceededError DOMException", () => {
    expect(isQuotaError(new DOMException("full", "QuotaExceededError"))).toBe(true);
  });

  it("rejects other errors", () => {
    expect(isQuotaError(new Error("boom"))).toBe(false);
    expect(isQuotaError(new DOMException("x", "NotFoundError"))).toBe(false);
  });
});
