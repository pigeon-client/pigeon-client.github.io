import { cn } from "@pigeon/ui";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { bodyUiGroup, highlightLanguageFor } from "@/shared/lib/contentType";
import { insertText, replaceRange } from "@/shared/lib/inputEdit";
import { formatJsonPreservingVars } from "@/shared/lib/jsonEditContext";
import { findMatches } from "@/shared/lib/textFind";
import type { BodyType, KeyValue } from "@/shared/types";
import { FindBar } from "@/shared/ui/FindBar";
import { VarKeyValueEditor } from "../../../environments/components/VarKeyValueEditor";
import { VarSuggestions } from "../../../environments/components/VarSuggestions";
import { useVarAutocomplete } from "../../../environments/hooks/useVarAutocomplete";
import { makeResolver } from "../../../environments/lib/resolve";
import { selectActiveEnv, useEnvStore } from "../../../environments/store";
import { useWordWrap } from "../../../settings/hooks/useWordWrap";
import { useAutoClose } from "../hooks/useAutoClose";
import {
  defaultBinaryFormat,
  defaultRawFormat,
  LINE_HEIGHT,
  measureWrappedLineHeights,
  type RadioId,
  radioFromBodyType,
} from "../lib/bodyEditorHelpers";
import { BinaryFilePane } from "./BinaryFilePane";
import { BodyTypeSelector } from "./BodyTypeSelector";
import { BodyVarOverlay } from "./BodyVarOverlay";
import { HighlightLayer } from "./HighlightLayer";
import { LineNumbers } from "./LineNumbers";

interface BodyEditorProps {
  bodyType: BodyType;
  body: string;
  formData: KeyValue[];
  multipart: KeyValue[];
  file: File | null;
  onBodyChange: (body: string) => void;
  onFormDataChange: (data: KeyValue[]) => void;
  onBodyTypeChange: (type: BodyType) => void;
  onMultipartChange: (data: KeyValue[]) => void;
  onFileChange: (file: File | null) => void;
}

export function BodyEditor({
  bodyType,
  body,
  formData,
  multipart,
  file,
  onBodyChange,
  onFormDataChange,
  onBodyTypeChange,
  onMultipartChange,
  onFileChange,
}: BodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const varOverlayRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const activeEnv = useEnvStore(selectActiveEnv);
  const globals = useEnvStore((s) => s.globals);
  const resolveToken = useMemo(() => makeResolver(activeEnv, globals), [activeEnv, globals]);
  const va = useVarAutocomplete();
  const { wordWrap, setWordWrap } = useWordWrap();
  const [lineHeights, setLineHeights] = useState<number[] | undefined>();

  // ⌘F find-in-body — navigation selects the match in the textarea and scrolls to it.
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const bodyMatches = useMemo(() => findMatches(body, findQuery), [body, findQuery]);
  const clampedFindIndex = bodyMatches.length ? Math.min(findIndex, bodyMatches.length - 1) : 0;
  const revealMatch = (idx: number) => {
    const ta = textareaRef.current;
    const start = bodyMatches[idx];
    if (!ta || start === undefined) return;
    ta.focus();
    ta.setSelectionRange(start, start + findQuery.length);
    const line = body.slice(0, start).split("\n").length;
    // Center the match line in the visible textarea height, not a fixed line offset.
    const visibleLines = Math.max(1, ta.clientHeight / LINE_HEIGHT);
    ta.scrollTop = Math.max(0, (line - 1 - visibleLines / 2) * LINE_HEIGHT);
    // Keep gutter + highlight layer in sync (same as handleScroll).
    if (lineNumRef.current) lineNumRef.current.scrollTop = ta.scrollTop;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
  };
  const findNext = () => {
    if (!bodyMatches.length) return;
    const n = (clampedFindIndex + 1) % bodyMatches.length;
    setFindIndex(n);
    revealMatch(n);
  };
  const findPrev = () => {
    if (!bodyMatches.length) return;
    const n = (clampedFindIndex - 1 + bodyMatches.length) % bodyMatches.length;
    setFindIndex(n);
    revealMatch(n);
  };
  const activeRadio = radioFromBodyType(bodyType);
  const { handleKeyDown } = useAutoClose(textareaRef, {
    jsonBlockExpand: activeRadio === "json",
    indent: 2,
  });
  const [rawFormat, setRawFormat] = useState<BodyType>(() => defaultRawFormat(bodyType));
  const [binaryFormat, setBinaryFormat] = useState<BodyType>(() => defaultBinaryFormat(bodyType));
  const [rawFormatOpen, setRawFormatOpen] = useState(false);
  const [binaryFormatOpen, setBinaryFormatOpen] = useState(false);
  const rawFormatRef = useRef<HTMLDivElement>(null);
  const binaryFormatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyUiGroup(bodyType) === "raw") setRawFormat(bodyType);
    if (bodyUiGroup(bodyType) === "binary") setBinaryFormat(bodyType);
  }, [bodyType]);

  useEffect(() => {
    if (!(rawFormatOpen || binaryFormatOpen)) return;
    const handler = (e: MouseEvent) => {
      if (rawFormatRef.current && !rawFormatRef.current.contains(e.target as Node)) {
        setRawFormatOpen(false);
      }
      if (binaryFormatRef.current && !binaryFormatRef.current.contains(e.target as Node)) {
        setBinaryFormatOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [rawFormatOpen, binaryFormatOpen]);

  const handleRadioSelect = (id: RadioId) => {
    if (id === "none") onBodyTypeChange("none");
    else if (id === "json") onBodyTypeChange("application/json");
    else if (id === "form-data") onBodyTypeChange("multipart/form-data");
    else if (id === "x-www-form-urlencoded") onBodyTypeChange("application/x-www-form-urlencoded");
    else if (id === "raw") onBodyTypeChange(rawFormat);
    else if (id === "binary") onBodyTypeChange(binaryFormat);
  };

  const formatJson = () => {
    if (
      (bodyType === "application/json" ||
        bodyType === "application/problem+json" ||
        bodyType === "application/graphql+json") &&
      body
    ) {
      try {
        const ta = textareaRef.current;
        const formatted = formatJsonPreservingVars(body);
        if (ta) replaceRange(ta, 0, ta.value.length, formatted);
        else onBodyChange(formatted);
      } catch {}
    }
  };

  const isCodeEditor = activeRadio === "json" || activeRadio === "raw";
  const jsonVarCommit = activeRadio === "json" ? { wrapJsonString: true as const } : undefined;
  const lineCount = body ? body.split("\n").length : 1;
  const canPrettyJson =
    bodyType === "application/json" ||
    bodyType === "application/problem+json" ||
    bodyType === "application/graphql+json";
  const language = highlightLanguageFor(bodyType);

  // Keep gutter heights in sync when wrap is on (long lines take >1 visual row).
  useLayoutEffect(() => {
    if (!(isCodeEditor && wordWrap)) {
      setLineHeights(undefined);
      return;
    }
    const pane = editorPaneRef.current;
    if (!pane) return;

    const update = () => {
      // textarea px-4 = 16px each side
      const width = Math.max(0, pane.clientWidth - 32);
      setLineHeights(measureWrappedLineHeights(body, width));
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(pane);
    return () => ro.disconnect();
  }, [body, wordWrap, isCodeEditor]);

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (lineNumRef.current) lineNumRef.current.scrollTop = ta.scrollTop;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
    if (varOverlayRef.current) {
      varOverlayRef.current.scrollTop = ta.scrollTop;
      varOverlayRef.current.scrollLeft = ta.scrollLeft;
    }
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: container-level ⌘F interception scopes find to the body editor
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-find-scope="body"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === "KeyF" && isCodeEditor) {
          e.preventDefault();
          e.stopPropagation();
          setFindOpen(true);
        }
      }}
    >
      <BodyTypeSelector
        activeRadio={activeRadio}
        onSelectRadio={handleRadioSelect}
        rawFormat={rawFormat}
        onSelectRawFormat={(f) => {
          setRawFormat(f);
          onBodyTypeChange(f);
          setRawFormatOpen(false);
        }}
        rawFormatOpen={rawFormatOpen}
        setRawFormatOpen={setRawFormatOpen}
        rawFormatRef={rawFormatRef}
        binaryFormat={binaryFormat}
        onSelectBinaryFormat={(f) => {
          setBinaryFormat(f);
          onBodyTypeChange(f);
          setBinaryFormatOpen(false);
        }}
        binaryFormatOpen={binaryFormatOpen}
        setBinaryFormatOpen={setBinaryFormatOpen}
        binaryFormatRef={binaryFormatRef}
        isCodeEditor={isCodeEditor}
        wordWrap={wordWrap}
        setWordWrap={setWordWrap}
        canPrettyJson={canPrettyJson}
        onFormatJson={formatJson}
      />

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col py-2">
        {activeRadio === "none" && (
          <div className="px-6 py-6 text-center text-xs text-muted-foreground">
            This request does not have a body
          </div>
        )}

        {isCodeEditor && (
          <div className="relative flex min-h-0 flex-1">
            {findOpen && (
              <div className="absolute right-3 top-1 z-dropdown">
                <FindBar
                  testId="body-find"
                  query={findQuery}
                  onQueryChange={setFindQuery}
                  matchCount={bodyMatches.length}
                  index={clampedFindIndex}
                  onNext={findNext}
                  onPrev={findPrev}
                  onClose={() => {
                    setFindOpen(false);
                    setFindQuery("");
                    textareaRef.current?.focus();
                  }}
                />
              </div>
            )}
            <LineNumbers count={lineCount} heights={lineHeights} scrollRef={lineNumRef} />
            {va.open && (
              <VarSuggestions
                items={va.items}
                index={va.index}
                onHover={va.setIndex}
                onPick={(name) => {
                  const ta = textareaRef.current;
                  if (ta) va.commitField(name, ta, jsonVarCommit);
                }}
                className="left-[46px] top-2"
              />
            )}
            <div ref={editorPaneRef} className="relative min-h-0 flex-1 overflow-hidden">
              <HighlightLayer
                code={body}
                language={language}
                wrap={wordWrap}
                scrollRef={highlightRef}
              />
              <BodyVarOverlay
                code={body}
                wrap={wordWrap}
                scrollRef={varOverlayRef}
                resolveToken={resolveToken}
                onTokenFocus={(offset) => {
                  const ta = textareaRef.current;
                  ta?.focus();
                  ta?.setSelectionRange(offset, offset);
                }}
              />
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => {
                  onBodyChange(e.target.value);
                  va.detect(e.target.value, e.target.selectionStart ?? e.target.value.length);
                }}
                onKeyUp={(e) =>
                  va.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
                }
                onClick={(e) =>
                  va.detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
                }
                onBlur={() => setTimeout(va.close, 120)}
                onPaste={(e) => {
                  if (!canPrettyJson) return;
                  const text = e.clipboardData.getData("text/plain");
                  const trimmed = text.trim();
                  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return;
                  try {
                    const formatted = formatJsonPreservingVars(text);
                    e.preventDefault();
                    const ta = e.currentTarget;
                    const start = ta.selectionStart ?? ta.value.length;
                    const end = ta.selectionEnd ?? start;
                    replaceRange(ta, start, end, formatted);
                    const caret = start + formatted.length;
                    ta.setSelectionRange(caret, caret);
                    handleScroll();
                  } catch {
                    // Fall back to the browser default paste.
                  }
                }}
                onScroll={handleScroll}
                onKeyDown={(e) => {
                  if (va.onKeyDownField(e, e.currentTarget, jsonVarCommit)) return;
                  if (handleKeyDown(e.nativeEvent)) {
                    e.preventDefault();
                    return;
                  }
                  if (e.key === "Tab") {
                    e.preventDefault();
                    insertText(e.currentTarget, "  ");
                  }
                }}
                placeholder={
                  activeRadio === "json" ? '{\n  "key": "value"\n}' : "Enter request body..."
                }
                spellCheck={false}
                className={cn(
                  "absolute inset-0 z-raised resize-none overflow-auto bg-transparent px-4 pb-1.5 font-mono text-code leading-[21px] text-transparent caret-foreground outline-none",
                  wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
                )}
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        )}

        {activeRadio === "x-www-form-urlencoded" && (
          <div className="px-4">
            <VarKeyValueEditor
              items={formData}
              onChange={onFormDataChange}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
            />
          </div>
        )}

        {activeRadio === "form-data" && (
          <div className="px-4">
            <VarKeyValueEditor
              items={multipart}
              onChange={onMultipartChange}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
              showFilePicker
            />
          </div>
        )}

        {activeRadio === "binary" && (
          <BinaryFilePane
            file={file}
            bodyType={bodyType}
            binaryFormat={binaryFormat}
            onFileChange={onFileChange}
            onAdoptFileMime={(mime) => {
              setBinaryFormat(mime);
              onBodyTypeChange(mime);
            }}
          />
        )}
      </div>
    </div>
  );
}
