import { KeyValueEditor, type KeyValueEditorProps } from "@/shared/ui/KeyValueEditor";
import { useVarAutocomplete } from "../hooks/useVarAutocomplete";
import { VarSuggestions } from "./VarSuggestions";

/**
 * KeyValueEditor pre-wired with `{{variable}}` autocomplete from the active
 * environment. Use this instead of the bare shared KeyValueEditor anywhere
 * values should offer env/global/random-token suggestions.
 */
export function VarKeyValueEditor(props: Omit<KeyValueEditorProps, "autocomplete">) {
  const va = useVarAutocomplete();
  return <KeyValueEditor {...props} autocomplete={{ ...va, Suggestions: VarSuggestions }} />;
}
