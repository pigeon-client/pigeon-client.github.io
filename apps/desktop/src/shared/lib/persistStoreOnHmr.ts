import type { StoreApi, UseBoundStore } from "zustand";

/** Keep Zustand state across Vite HMR and reload from DB when the store resets empty. */
export function persistStoreOnHmr<T>(
  key: string,
  store: UseBoundStore<StoreApi<T>>,
  options: { reload: () => void; isLoaded: (state: T) => boolean },
) {
  if (!import.meta.hot?.data) return;

  const prev = import.meta.hot.data[key] as UseBoundStore<StoreApi<T>> | undefined;
  if (prev) {
    store.setState(prev.getState());
  }

  import.meta.hot.dispose((data) => {
    data[key] = store;
  });

  if (!options.isLoaded(store.getState())) {
    options.reload();
  }
}
