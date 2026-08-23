import pigeonLogo from "@pigeon/brand/pigeon-mark.svg";
import { Button, Kbd } from "@pigeon/ui";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
// biome-ignore lint/style/noRestrictedImports: request-builder barrel also exports UrlBar, which notifies this store
import { loadSampleRequest } from "@/features/rest/request-builder/lib/firstRequest";
// biome-ignore lint/style/noRestrictedImports: request-builder barrel also exports UrlBar, which notifies this store
import { useTabStore } from "@/features/rest/request-builder/store";
import { getWindowKind } from "@/shared/lib/windowKind";
import {
  completeOnboarding,
  hasOpenHttpRequest,
  subscribeOnboardingSend,
  useOnboardingPending,
} from "../lib/store";
import { coachCardStyle, OnboardingSpotlight, useTargetRect } from "./OnboardingSpotlight";

type Step = "welcome" | "url" | "send";

const URL_SEL = '[data-testid="url-bar-compose"]';
const SEND_SEL = "[data-send-btn]";

export function Onboarding() {
  const pending = useOnboardingPending();
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);
  const startedRef = useRef(false);
  const rest = getWindowKind() === "rest";
  const hasRequest = useTabStore((s) => hasOpenHttpRequest(s.tabs));

  // Returning session with a URL already open: never start the tour, and don't
  // offer it later if they clear the tab.
  useEffect(() => {
    if (!(pending && rest) || startedRef.current || !hasRequest) return;
    completeOnboarding();
  }, [pending, rest, hasRequest]);

  useEffect(() => {
    if (!(pending && rest)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      completeOnboarding();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pending, rest]);

  useEffect(() => {
    if (!(rest && step === "send")) return;
    return subscribeOnboardingSend(() => {
      setToast(true);
      completeOnboarding();
      window.setTimeout(() => setToast(false), 2800);
    });
  }, [rest, step]);

  if (!rest) return null;
  if (!(pending || toast)) return null;
  if (pending && !startedRef.current && hasRequest) return null;

  const start = () => {
    startedRef.current = true;
    setLoading(true);
    void loadSampleRequest()
      .catch(() => null)
      .finally(() => {
        setLoading(false);
        setStep("url");
      });
  };

  return createPortal(
    <>
      {pending && step === "welcome" ? (
        <Welcome loading={loading} onStart={start} onSkip={completeOnboarding} />
      ) : null}
      {pending && step === "url" ? (
        <TourStep
          selector={URL_SEL}
          index={1}
          title="The URL bar"
          body="Method on the left, address in the middle. Paste a curl command if you already have one."
          onNext={() => setStep("send")}
          onSkip={completeOnboarding}
        />
      ) : null}
      {pending && step === "send" ? (
        <TourStep
          selector={SEND_SEL}
          index={2}
          title="Send it"
          body="This sample is a public GET — safe to run. Click Send, or press"
          onSkip={completeOnboarding}
        />
      ) : null}
      {toast ? (
        <div
          data-testid="onboarding-toast"
          className="fixed bottom-4 right-4 z-toast rounded-lg border border-border bg-card px-4 py-3 text-xs font-medium text-foreground shadow-toast"
        >
          First request sent. ⌘Enter sends, ⌘T opens a tab.
        </div>
      ) : null}
    </>,
    document.body,
  );
}

function Welcome({
  loading,
  onStart,
  onSkip,
}: {
  loading: boolean;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-scrim backdrop-blur-[8px]"
      data-testid="onboarding"
      data-onboarding-step="welcome"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="flex w-[400px] max-w-[calc(100vw-48px)] flex-col items-center rounded-lg border border-border bg-card px-8 py-8 shadow-modal"
      >
        <img
          src={pigeonLogo}
          alt=""
          aria-hidden="true"
          className="pg-logo mb-4 h-14 w-14 object-contain"
        />
        <h2 id="onboarding-title" className="m-0 text-lg font-bold tracking-tight text-foreground">
          Pigeon
        </h2>
        <p className="mt-2 mb-6 max-w-[280px] text-center text-sm leading-relaxed text-muted-foreground">
          Send your first request. URL, Send, response — that is the whole loop.
        </p>
        <div className="mb-6 grid w-full grid-cols-3 gap-2">
          {[
            { n: "1", label: "URL" },
            { n: "2", label: "Send" },
            { n: "3", label: "Response" },
          ].map((item) => (
            <div
              key={item.n}
              className="flex flex-col items-center gap-1.5 rounded border border-border bg-background/50 py-3"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-2xs font-semibold text-primary">
                {item.n}
              </span>
              <span className="text-2xs font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={loading}
          data-testid="onboarding-start"
          onClick={onStart}
        >
          Get started
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          data-testid="onboarding-skip"
          onClick={onSkip}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

function TourStep({
  selector,
  index,
  title,
  body,
  onNext,
  onSkip,
}: {
  selector: string;
  index: 1 | 2;
  title: string;
  body: string;
  onNext?: () => void;
  onSkip: () => void;
}) {
  const rect = useTargetRect(selector);
  const pos = coachCardStyle(rect);

  return (
    <div data-testid="onboarding" data-onboarding-step={index === 1 ? "url" : "send"}>
      <OnboardingSpotlight rect={rect} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-step-title"
        className="fixed z-modal w-[340px] max-w-[calc(100vw-32px)] rounded-lg border border-border bg-card p-4 shadow-modal"
        style={{ top: pos.top, left: pos.left }}
      >
        <p className="m-0 mb-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {index} of 2
        </p>
        <h2 id="onboarding-step-title" className="m-0 text-sm font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-1.5 mb-4 text-xs leading-relaxed text-muted-foreground">
          {body}
          {index === 2 ? (
            <>
              {" "}
              <Kbd size="sm">⌘</Kbd>
              <Kbd size="sm" className="ml-0.5">
                Enter
              </Kbd>
            </>
          ) : null}
        </p>
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            data-testid="onboarding-skip"
            onClick={onSkip}
          >
            Skip
          </Button>
          {onNext ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              data-testid="onboarding-next"
              onClick={onNext}
            >
              Next
            </Button>
          ) : (
            <span className="text-2xs text-muted-foreground">Waiting for Send…</span>
          )}
        </div>
      </div>
    </div>
  );
}
