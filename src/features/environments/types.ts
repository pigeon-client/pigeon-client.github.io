/** A single environment variable. `secret` masks the value in the UI (display
    only in v1); `enabled` excludes it from interpolation when false. */
export interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
  secret: boolean;
}

/** A named variable set. `isProduction` drives the danger cues + guardrails. */
export interface Environment {
  id: string;
  name: string;
  isProduction: boolean;
  variables: EnvVariable[];
}

/** Reserved id for the built-in "Globals" set (always present). */
export const GLOBALS_ID = "globals";

/** The four built-in dynamic tokens (regenerated per resolve). `$`-prefixed
    keys are reserved — the editor rejects user keys starting with `$`. */
export const RANDOM_TOKENS = ["$email", "$firstName", "$lastName", "$uuid"] as const;
