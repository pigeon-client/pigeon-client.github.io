export interface JsonSchemaProperty {
  type?: string;
  enum?: (string | number)[];
  description?: string;
  default?: unknown;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
}

const SIMPLE_TYPES = new Set(["string", "number", "integer", "boolean"]);

/** True when every declared property is a scalar we can render as a real form field. */
export function isSimpleSchema(schema: JsonSchema | undefined): boolean {
  if (!schema?.properties) return false;
  return Object.values(schema.properties).every((p) => !p.type || SIMPLE_TYPES.has(p.type));
}

/** Coerce a form field's raw string input to the type its schema property declares. */
export function coerceArgValue(prop: JsonSchemaProperty | undefined, raw: string): unknown {
  switch (prop?.type) {
    case "number":
    case "integer":
      return raw === "" ? undefined : Number(raw);
    case "boolean":
      return raw === "true";
    default:
      return raw;
  }
}

/** Build the `arguments` object for a `tools/call` from per-field string values. */
export function buildToolArgs(
  schema: JsonSchema | undefined,
  values: Record<string, string>,
): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (raw === "" && !schema?.required?.includes(key)) continue;
    args[key] = coerceArgValue(schema?.properties?.[key], raw);
  }
  return args;
}
