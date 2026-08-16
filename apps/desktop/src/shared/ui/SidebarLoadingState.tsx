/** Shown while persisted sidebar data is still loading from the DB. */
export function SidebarLoadingState({ label }: { label: string }) {
  return (
    <div className="px-3 py-4 text-xs text-muted-foreground" aria-busy="true">
      {label}
    </div>
  );
}
