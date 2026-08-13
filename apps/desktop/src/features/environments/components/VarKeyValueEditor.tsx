import { KeyValueEditor, type KeyValueEditorProps } from "@/shared/ui/KeyValueEditor";
import { useVarAutocomplete } from "../hooks/useVarAutocomplete";
import { makeResolver } from "../lib/resolve";
import { selectActiveEnv, useEnvStore } from "../store";
import { VarSuggestions } from "./VarSuggestions";

/**
 * KeyValueEditor pre-wired with `{{variable}}` autocomplete from the active
 * environment. Use this instead of the bare shared KeyValueEditor anywhere
 * values should offer env/global/random-token suggestions.
 */
export function VarKeyValueEditor(
  props: Omit<KeyValueEditorProps, "autocomplete" | "resolveToken">,
) {
  const va = useVarAutocomplete();
  const activeEnv = useEnvStore(selectActiveEnv);
  const globals = useEnvStore((s) => s.globals);
  const resolveToken = makeResolver(activeEnv, globals);

  return (
    <KeyValueEditor
      {...props}
      autocomplete={{ ...va, Suggestions: VarSuggestions }}
      resolveToken={resolveToken}
    />
  );
}
