import { useScrollReveal } from "../hooks/useScrollReveal";

/** Tiny island so SSR homepage sections still reveal without hydrating the whole page. */
export function ScrollReveal() {
  useScrollReveal();
  return null;
}
