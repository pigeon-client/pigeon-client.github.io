import { useSyncExternalStore } from "react";

const KEY = "pg_onboarding_complete";

type Listener = () => void;
const listeners = new Set<Listener>();
const sendListeners = new Set<Listener>();

function readPending(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(KEY) !== "true";
}

export function isOnboardingPending(): boolean {
  return readPending();
}

/** True when any HTTP tab already has a URL — the empty-request state is gone. */
export function hasOpenHttpRequest(
  tabs: ReadonlyArray<{ kind: string; request: { url: string } }>,
): boolean {
  return tabs.some((t) => t.kind === "http" && t.request.url.trim().length > 0);
}

export function completeOnboarding(): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, "true");
  for (const listener of listeners) listener();
}

export function subscribeOnboarding(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function useOnboardingPending(): boolean {
  return useSyncExternalStore(subscribeOnboarding, isOnboardingPending, isOnboardingPending);
}

/** UrlBar calls this when the user actually sends — onboarding step 2 advances. */
export function notifyOnboardingSend(): void {
  for (const listener of sendListeners) listener();
}

export function subscribeOnboardingSend(listener: () => void): () => void {
  sendListeners.add(listener);
  return () => {
    sendListeners.delete(listener);
  };
}
