import { randomBuiltinForPreview } from "@/shared/lib/template";

export interface TokenPreviewInfo {
  name: string;
  value: string | null;
  random: boolean;
}

export function getTokenPreview(
  name: string,
  resolve: (name: string) => string | undefined,
): TokenPreviewInfo {
  if (name.startsWith("$")) {
    return { name, value: randomBuiltinForPreview(name) ?? null, random: true };
  }
  const value = resolve(name);
  return { name, value: value ?? null, random: false };
}

export function formatTokenTooltip(info: TokenPreviewInfo): string {
  if (info.random) {
    if (info.value) return info.value;
    return "generated per send";
  }
  if (info.value === null) return "unresolved";
  return info.value;
}
