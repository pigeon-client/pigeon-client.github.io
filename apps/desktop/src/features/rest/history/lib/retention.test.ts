import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_RETENTION_DAYS,
  getRetentionDays,
  isStale,
  partitionByRetention,
  setRetentionDays,
} from "./retention";

const DAY = 24 * 60 * 60 * 1000;

describe("retention", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 90 days when unset", () => {
    expect(getRetentionDays()).toBe(DEFAULT_RETENTION_DAYS);
  });

  it("round-trips a chosen window", () => {
    setRetentionDays(30);
    expect(getRetentionDays()).toBe(30);
    setRetentionDays(null);
    expect(getRetentionDays()).toBeNull();
  });

  it("forever (null) never marks anything stale", () => {
    expect(isStale(0, null, Date.now())).toBe(false);
  });

  it("prunes items older than the window and keeps items inside it", () => {
    const now = 1_000_000 * DAY;
    const items = [
      { id: 1, timestamp: now }, // just now — kept
      { id: 2, timestamp: now - 89 * DAY }, // inside 90d window — kept
      { id: 3, timestamp: now - 91 * DAY }, // outside — pruned
      { id: 4, timestamp: now - 365 * DAY }, // way outside — pruned
    ];
    const { kept, pruned } = partitionByRetention(items, 90, now);
    expect(kept.map((i) => i.id)).toEqual([1, 2]);
    expect(pruned.map((i) => i.id)).toEqual([3, 4]);
  });
});
