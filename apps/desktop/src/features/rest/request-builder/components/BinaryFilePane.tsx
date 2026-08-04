import { BINARY_BODY_FORMATS } from "@/shared/lib/contentType";
import type { BodyType } from "@/shared/types";

export function BinaryFilePane({
  file,
  bodyType,
  binaryFormat,
  onFileChange,
  onAdoptFileMime,
}: {
  file: File | null;
  bodyType: BodyType;
  binaryFormat: BodyType;
  onFileChange: (file: File | null) => void;
  /** Auto-adopt the picked file's MIME type when still on generic octet-stream. */
  onAdoptFileMime: (mime: BodyType) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-4">
      <div className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer">
          <div className="inline-flex h-8 items-center gap-1.5 rounded border border-border px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {file ? file.name : "Select File"}
          </div>
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              onFileChange(f);
              if (
                binaryFormat === "application/octet-stream" &&
                f.type &&
                BINARY_BODY_FORMATS.some((fmt) => fmt.value === f.type)
              ) {
                onAdoptFileMime(f.type as BodyType);
              }
            }}
          />
        </label>
        {file && (
          <>
            <span className="text-2xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
              {file.type ? ` · ${file.type}` : ""}
            </span>
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="bg-transparent font-[inherit] text-xs text-destructive"
            >
              Remove
            </button>
          </>
        )}
      </div>
      <p className="text-2xs text-muted-foreground">
        Sends as <span className="font-mono text-foreground">{bodyType}</span>
        {" · "}
        {BINARY_BODY_FORMATS.find((f) => f.value === binaryFormat)?.spec}
      </p>
    </div>
  );
}
