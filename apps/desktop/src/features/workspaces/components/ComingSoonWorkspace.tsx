import { Card } from "@pigeon/ui";

/** Full-pane placeholder for workspaces that are not shipping yet. */
export function ComingSoonWorkspace({
  kind,
  title,
  description,
}: {
  kind: "mcp" | "graphql";
  title: string;
  description: string;
}) {
  return (
    <div
      data-testid={`${kind}-coming-soon`}
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center"
    >
      <Card className="flex max-w-md flex-col items-center gap-2 rounded-lg px-6 py-8">
        <p className="m-0 text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Coming soon
        </p>
        <p className="m-0 text-sm font-semibold text-foreground">{title}</p>
        <p className="m-0 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </Card>
    </div>
  );
}
