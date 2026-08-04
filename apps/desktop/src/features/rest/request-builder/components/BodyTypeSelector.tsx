import { Button } from "@pigeon/ui";
import { Check, ChevronDown, WrapText } from "lucide-react";
import type { RefObject } from "react";
import { BINARY_BODY_FORMATS, RAW_BODY_FORMATS } from "@/shared/lib/contentType";
import { cn } from "@/shared/lib/utils";
import type { BodyType } from "@/shared/types";
import type { RadioId } from "../lib/bodyEditorHelpers";

const BODY_TYPES: { id: RadioId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "json", label: "JSON" },
  { id: "raw", label: "Raw" },
  { id: "form-data", label: "Form Data" },
  { id: "x-www-form-urlencoded", label: "URL Encoded" },
  { id: "binary", label: "Binary" },
];

/* ── Type selector row: body-type radios, raw/binary format dropdowns, wrap + format buttons ── */
export function BodyTypeSelector({
  activeRadio,
  onSelectRadio,
  rawFormat,
  onSelectRawFormat,
  rawFormatOpen,
  setRawFormatOpen,
  rawFormatRef,
  binaryFormat,
  onSelectBinaryFormat,
  binaryFormatOpen,
  setBinaryFormatOpen,
  binaryFormatRef,
  isCodeEditor,
  wordWrap,
  setWordWrap,
  canPrettyJson,
  onFormatJson,
}: {
  activeRadio: RadioId;
  onSelectRadio: (id: RadioId) => void;
  rawFormat: BodyType;
  onSelectRawFormat: (format: BodyType) => void;
  rawFormatOpen: boolean;
  setRawFormatOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  rawFormatRef: RefObject<HTMLDivElement | null>;
  binaryFormat: BodyType;
  onSelectBinaryFormat: (format: BodyType) => void;
  binaryFormatOpen: boolean;
  setBinaryFormatOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  binaryFormatRef: RefObject<HTMLDivElement | null>;
  isCodeEditor: boolean;
  wordWrap: boolean;
  setWordWrap: (v: boolean) => void;
  canPrettyJson: boolean;
  onFormatJson: () => void;
}) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between gap-1.5 border-b border-border px-4 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {BODY_TYPES.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => onSelectRadio(t.id)}
            className={cn(
              "inline-flex h-6.5 cursor-pointer items-center rounded border px-2.5 text-xs transition-colors",
              activeRadio === t.id
                ? "border-primary/40 bg-primary/15 font-semibold text-primary"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
        {activeRadio === "raw" && (
          <div className="relative shrink-0" ref={rawFormatRef}>
            <button
              type="button"
              onClick={() => setRawFormatOpen((o) => !o)}
              title={RAW_BODY_FORMATS.find((f) => f.value === rawFormat)?.spec}
              className={cn(
                "inline-flex h-6.5 cursor-pointer items-center gap-1.5 rounded border px-2.5 text-xs transition-colors",
                rawFormatOpen
                  ? "border-primary/40 bg-primary/15 font-semibold text-primary"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {RAW_BODY_FORMATS.find((f) => f.value === rawFormat)?.label ?? "Raw"}
              <ChevronDown className="h-3 w-3" />
            </button>

            {rawFormatOpen && (
              <div className="absolute left-0 top-8 z-[var(--z-dropdown)] max-h-72 w-[220px] overflow-auto rounded border border-border bg-popover p-1 shadow-lg">
                {RAW_BODY_FORMATS.map((f) => (
                  <Button
                    key={f.value}
                    variant="ghost"
                    size="xs"
                    onClick={() => onSelectRawFormat(f.value)}
                    className={cn(
                      "w-full justify-between",
                      f.value === rawFormat ? "text-primary" : "text-foreground",
                    )}
                    title={f.spec}
                  >
                    <span className="truncate">{f.label}</span>
                    {f.value === rawFormat && <Check className="h-3 w-3 shrink-0" />}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
        {activeRadio === "binary" && (
          <div className="relative shrink-0" ref={binaryFormatRef}>
            <button
              type="button"
              onClick={() => setBinaryFormatOpen((o) => !o)}
              title={BINARY_BODY_FORMATS.find((f) => f.value === binaryFormat)?.spec}
              className={cn(
                "inline-flex h-6.5 cursor-pointer items-center gap-1.5 rounded border px-2.5 text-xs transition-colors",
                binaryFormatOpen
                  ? "border-primary/40 bg-primary/15 font-semibold text-primary"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {BINARY_BODY_FORMATS.find((f) => f.value === binaryFormat)?.label ?? "Octet Stream"}
              <ChevronDown className="h-3 w-3" />
            </button>

            {binaryFormatOpen && (
              <div className="absolute left-0 top-8 z-[var(--z-dropdown)] max-h-72 w-[220px] overflow-auto rounded border border-border bg-popover p-1 shadow-lg">
                {BINARY_BODY_FORMATS.map((f) => (
                  <Button
                    key={f.value}
                    variant="ghost"
                    size="xs"
                    onClick={() => onSelectBinaryFormat(f.value)}
                    className={cn(
                      "w-full justify-between",
                      f.value === binaryFormat ? "text-primary" : "text-foreground",
                    )}
                    title={f.spec}
                  >
                    <span className="truncate">{f.label}</span>
                    {f.value === binaryFormat && <Check className="h-3 w-3 shrink-0" />}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isCodeEditor && (
          <Button
            variant="ghost"
            size="icon"
            data-testid="body-wrap-toggle"
            onClick={() => setWordWrap(!wordWrap)}
            aria-pressed={wordWrap}
            title={wordWrap ? "Word wrap: on" : "Word wrap: off"}
            className={wordWrap ? "text-primary" : undefined}
          >
            <WrapText className="h-3.5 w-3.5" />
          </Button>
        )}
        {canPrettyJson && (
          <Button variant="ghost" size="xs" onClick={onFormatJson} className="shrink-0 gap-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 7V4h16v3M9 20h6M12 4v16" />
            </svg>
            Format
          </Button>
        )}
      </div>
    </div>
  );
}
