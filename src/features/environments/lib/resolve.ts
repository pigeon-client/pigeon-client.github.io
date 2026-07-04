import { interpolate } from "@/shared/lib/template";
import type { Environment } from "../types";

/**
 * Replace {{var}} tokens in a string using the active environment's variables.
 * Delegates the actual interpolation to shared/lib/template (pure).
 */
export function replaceEnvVariables(str: string, env: Environment | null): string {
  if (!env?.variables) return str;
  return interpolate(str, env.variables);
}
