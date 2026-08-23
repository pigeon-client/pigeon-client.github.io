import { beforeEach, describe, expect, it } from "vitest";
import {
  completeOnboarding,
  hasOpenHttpRequest,
  isOnboardingPending,
  notifyOnboardingSend,
  subscribeOnboardingSend,
} from "./store";

beforeEach(() => {
  localStorage.clear();
});

describe("onboarding store", () => {
  it("starts pending and completes once", () => {
    expect(isOnboardingPending()).toBe(true);
    completeOnboarding();
    expect(isOnboardingPending()).toBe(false);
    completeOnboarding();
    expect(isOnboardingPending()).toBe(false);
  });

  it("treats any HTTP tab with a URL as an open request", () => {
    expect(hasOpenHttpRequest([{ kind: "http", request: { url: "" } }])).toBe(false);
    expect(
      hasOpenHttpRequest([{ kind: "http", request: { url: "https://api.example.com" } }]),
    ).toBe(true);
  });

  it("notifies send subscribers", () => {
    let n = 0;
    const stop = subscribeOnboardingSend(() => {
      n += 1;
    });
    notifyOnboardingSend();
    notifyOnboardingSend();
    expect(n).toBe(2);
    stop();
    notifyOnboardingSend();
    expect(n).toBe(2);
  });
});
