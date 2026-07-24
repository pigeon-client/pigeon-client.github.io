import { useCallback, useEffect, useState } from "react";
import { getWordWrap, setWordWrap, subscribeWordWrap } from "../lib/wordWrap";

/** Live word-wrap pref — body, response, and Settings stay in sync + persist. */
export function useWordWrap() {
  const [wordWrap, setState] = useState(getWordWrap);

  useEffect(() => subscribeWordWrap(setState), []);

  const set = useCallback((value: boolean) => {
    setWordWrap(value);
  }, []);

  const toggle = useCallback(() => {
    setWordWrap(!getWordWrap());
  }, []);

  return { wordWrap, setWordWrap: set, toggleWordWrap: toggle };
}
