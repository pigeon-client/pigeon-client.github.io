/** Empty-body placeholder keyed by HTTP status (or class fallback). */

type EmptyCopy = { title: string; hint: string };

const KNOWN: Record<number, EmptyCopy> = {
  100: { title: "Continue", hint: "Informational — no body expected." },
  101: { title: "Switching Protocols", hint: "Protocol upgrade in progress." },
  204: { title: "No Content", hint: "Request succeeded with an empty body." },
  205: { title: "Reset Content", hint: "Server asks the client to reset the view." },
  301: { title: "Moved Permanently", hint: "Resource moved. Follow Location or send again." },
  302: { title: "Found", hint: "Temporary redirect — check the Location header." },
  304: { title: "Not Modified", hint: "Cached response still valid — no body returned." },
  400: { title: "Bad Request", hint: "Server rejected the request. Check params and body." },
  401: { title: "Unauthorized", hint: "Authentication required or credentials rejected." },
  403: { title: "Forbidden", hint: "No permission to access this resource." },
  404: { title: "Not Found", hint: "Nothing here. Check the URL or resource ID." },
  405: { title: "Method Not Allowed", hint: "This HTTP method isn't supported here." },
  408: { title: "Request Timeout", hint: "Server timed out waiting for the request." },
  410: { title: "Gone", hint: "Resource existed once but is permanently gone." },
  418: { title: "I'm a teapot", hint: "Short and stout. (RFC 2324)" },
  429: { title: "Too Many Requests", hint: "Rate limited. Slow down and try again." },
  500: { title: "Internal Server Error", hint: "Server hit an unexpected error." },
  501: { title: "Not Implemented", hint: "Server doesn't support this method or feature." },
  502: { title: "Bad Gateway", hint: "Upstream returned an invalid response." },
  503: { title: "Service Unavailable", hint: "Server temporarily overloaded or down." },
  504: { title: "Gateway Timeout", hint: "Upstream didn't respond in time." },
};

function copyFor(status: number, statusText: string): EmptyCopy {
  if (KNOWN[status]) return KNOWN[status];
  if (status === 0) {
    return {
      title: "Request failed",
      hint: statusText.trim() || "Transport error — no response body.",
    };
  }
  if (status >= 100 && status < 200) {
    return { title: "Informational", hint: "No body for this informational response." };
  }
  if (status >= 200 && status < 300) {
    return { title: "Success", hint: "Succeeded, but the server sent an empty body." };
  }
  if (status >= 300 && status < 400) {
    return {
      title: "Redirect",
      hint: statusText.trim() || "Redirect with no body — check Location.",
    };
  }
  if (status >= 400 && status < 500) {
    return {
      title: "Client error",
      hint: statusText.trim() || "Client error with an empty body.",
    };
  }
  if (status >= 500) {
    return {
      title: "Server error",
      hint: statusText.trim() || "Server error with an empty body.",
    };
  }
  return { title: statusText.trim() || "Empty body", hint: "Empty response body." };
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "var(--status-2xx)";
  if (status >= 300 && status < 400) return "var(--status-3xx)";
  if (status >= 400 && status < 500) return "var(--status-4xx)";
  if (status >= 500) return "var(--status-5xx)";
  return "var(--text-secondary)";
}

/** Simple line-art mark per status class — not a real product screenshot. */
function StatusMark({ status, color }: { status: number; color: string }) {
  const stroke = color;
  if (status === 0) {
    return (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <circle cx="28" cy="28" r="20" stroke={stroke} strokeWidth="1.5" opacity="0.35" />
        <path
          d="M20 20l16 16M36 20L20 36"
          stroke={stroke}
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (status >= 200 && status < 300) {
    return (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <circle cx="28" cy="28" r="20" stroke={stroke} strokeWidth="1.5" opacity="0.35" />
        <path
          d="M18 29l7 7 13-15"
          stroke={stroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status >= 300 && status < 400) {
    return (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <circle cx="28" cy="28" r="20" stroke={stroke} strokeWidth="1.5" opacity="0.35" />
        <path
          d="M18 28h16M28 20l8 8-8 8"
          stroke={stroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status >= 400 && status < 500) {
    return (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <circle cx="28" cy="28" r="20" stroke={stroke} strokeWidth="1.5" opacity="0.35" />
        <circle cx="28" cy="28" r="3" fill={stroke} />
        <path
          d="M28 16v8M28 34v6"
          stroke={stroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    );
  }
  // 1xx / 5xx / other
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <circle cx="28" cy="28" r="20" stroke={stroke} strokeWidth="1.5" opacity="0.35" />
      <path d="M28 18v14" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="28" cy="38" r="1.75" fill={stroke} />
    </svg>
  );
}

export function StatusEmptyBody({ status, statusText }: { status: number; statusText: string }) {
  const color = statusColor(status);
  const { title, hint } = copyFor(status, statusText);

  return (
    <div
      data-testid="response-empty-body"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "48px 24px",
        textAlign: "center",
        minHeight: 180,
      }}
    >
      <div style={{ opacity: 0.9 }}>
        <StatusMark status={status} color={color} />
      </div>
      <div>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color,
            fontFamily: "var(--font-mono)",
          }}
        >
          {status > 0 ? `${status} · ${title}` : title}
        </p>
        <p
          style={{
            margin: 0,
            maxWidth: 320,
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </p>
      </div>
    </div>
  );
}
