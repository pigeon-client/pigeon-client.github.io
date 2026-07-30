import { Braces } from "lucide-react";

/** Placeholder pane for the GraphQL workspace tab — feature not shipped yet. */
export function GraphqlComingSoon() {
  return (
    <div
      data-testid="graphql-coming-soon"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-12 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
        <Braces className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="m-0 text-sm font-semibold text-foreground">GraphQL — coming soon</p>
        <p className="m-0 mt-1.5 max-w-[420px] text-xs leading-relaxed text-muted-foreground">
          A dedicated GraphQL workspace — query editor with schema introspection, variables, and
          response inspection — is on the roadmap. Until then, GraphQL requests can be sent as HTTP
          with an <span className="font-mono">application/graphql</span> body.
        </p>
      </div>
    </div>
  );
}
