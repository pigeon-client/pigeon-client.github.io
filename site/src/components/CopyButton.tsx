import { useRef, useState } from "react";

/** Copy-to-clipboard button used in the install command boxes. */
export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number>();

  const copy = () => {
    const flag = () => {
      setDone(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDone(false), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(flag, flag);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
      flag();
    }
  };

  return (
    <button
      type="button"
      className={`copy${done ? " done" : ""}`}
      onClick={copy}
      aria-label="Copy install command"
    >
      {done ? "copied!" : "copy"}
    </button>
  );
}

/** `$ <cmd> [copy]` install box. */
export function InstallBox({ command }: { command: string }) {
  return (
    <div className="install">
      <span className="dollar" aria-hidden="true">
        $
      </span>
      <code>{command}</code>
      <CopyButton text={command} />
    </div>
  );
}
