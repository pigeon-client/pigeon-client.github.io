import type { RequestConfig } from "@/shared/types";
import type { CollectionNode } from "../../collections/types";
import type { RequestModel } from "../model/RequestModel";
import { requestModelToRequestConfig } from "./requestModelAdapter";

/* ── Postman Collection v2.1 export format (informal, permissive parsing) ── */

interface PostmanKeyValue {
  key: string;
  value?: string;
  disabled?: boolean;
  type?: string;
}

interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: PostmanKeyValue[];
}

interface PostmanBody {
  mode?: string;
  raw?: string;
  urlencoded?: PostmanKeyValue[];
  formdata?: PostmanKeyValue[];
  graphql?: { query?: string };
  options?: { raw?: { language?: string } };
}

interface PostmanAuth {
  type?: string;
  bearer?: PostmanKeyValue[];
  basic?: PostmanKeyValue[];
  apikey?: PostmanKeyValue[];
}

interface PostmanRequest {
  method?: string;
  header?: PostmanKeyValue[];
  body?: PostmanBody;
  url?: string | PostmanUrl;
  auth?: PostmanAuth;
}

interface PostmanItem {
  name?: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
}

interface PostmanCollectionFile {
  info?: { name?: string };
  item?: PostmanItem[];
}

const genId = () => crypto.randomUUID();

function authEntry(entries: PostmanKeyValue[] | undefined, key: string): string {
  return entries?.find((e) => e.key === key)?.value ?? "";
}

function toAuth(auth: PostmanAuth | undefined): RequestModel["auth"] {
  switch (auth?.type) {
    case "bearer":
      return { type: "bearer", token: authEntry(auth.bearer, "token") };
    case "basic":
      return {
        type: "basic",
        username: authEntry(auth.basic, "username"),
        password: authEntry(auth.basic, "password"),
      };
    case "apikey":
      return {
        type: "apikey",
        apiKey: authEntry(auth.apikey, "value"),
        apiKeyHeader: authEntry(auth.apikey, "key"),
      };
    default:
      return { type: "none" };
  }
}

function toUrl(url: PostmanRequest["url"]): RequestModel["url"] {
  if (typeof url === "string") return { raw: url, path: [], query: [] };
  const raw =
    url?.raw ??
    `${url?.protocol ? `${url.protocol}://` : ""}${(url?.host ?? []).join(".")}${
      url?.path?.length ? `/${url.path.join("/")}` : ""
    }`;
  return {
    raw,
    protocol: url?.protocol,
    host: url?.host?.join("."),
    path: url?.path ?? [],
    query: (url?.query ?? [])
      .filter((q) => q.key)
      .map((q) => ({ key: q.key, value: q.value ?? "", enabled: !q.disabled })),
  };
}

function toBody(body: PostmanBody | undefined): RequestModel["body"] {
  switch (body?.mode) {
    case "raw":
      return {
        mode: body.options?.raw?.language === "json" ? "json" : "raw",
        raw: body.raw ?? "",
      };
    case "urlencoded":
      return {
        mode: "urlencoded",
        urlEncoded: (body.urlencoded ?? []).map((f) => ({
          key: f.key,
          value: f.value ?? "",
          type: "text",
          enabled: !f.disabled,
        })),
      };
    case "formdata":
      // File fields can't be recovered from a Postman export (no bytes) — text only.
      return {
        mode: "form-data",
        formData: (body.formdata ?? [])
          .filter((f) => f.type !== "file")
          .map((f) => ({ key: f.key, value: f.value ?? "", type: "text", enabled: !f.disabled })),
      };
    case "graphql":
      return { mode: "raw", raw: body.graphql?.query ?? "" };
    default:
      return { mode: "none" };
  }
}

const blankRequest = (): RequestConfig => ({
  name: "Untitled Request",
  method: "GET",
  url: "",
  params: [],
  headers: [],
  bodyType: "none",
  body: "",
  formData: [],
  multipart: [],
  file: null,
  auth: {
    type: "none",
    username: "",
    password: "",
    token: "",
    apiKey: "",
    apiValue: "",
    apiAddTo: "header",
  },
});

function itemToRequestConfig(item: PostmanItem): RequestConfig {
  const req = item.request ?? {};
  const model: RequestModel = {
    id: genId(),
    name: item.name,
    method: req.method ?? "GET",
    url: toUrl(req.url),
    headers: (req.header ?? [])
      .filter((h) => h.key)
      .map((h) => ({ key: h.key, value: h.value ?? "", enabled: !h.disabled })),
    cookies: [],
    auth: toAuth(req.auth),
    body: toBody(req.body),
    options: { followRedirects: true, compressed: false, insecure: false },
  };
  const partial = requestModelToRequestConfig(model);
  return { ...blankRequest(), ...partial, name: item.name || partial.name || "Untitled Request" };
}

function itemToNode(item: PostmanItem): CollectionNode {
  if (item.item) {
    return {
      id: genId(),
      type: "folder",
      name: item.name || "Folder",
      children: item.item.map(itemToNode),
    };
  }
  const request = itemToRequestConfig(item);
  return {
    id: genId(),
    type: "request",
    name: request.name,
    request,
    method: request.method,
    url: request.url,
  };
}

export interface ParsedPostmanCollection {
  name: string;
  root: CollectionNode[];
  requestCount: number;
}

function countRequests(nodes: CollectionNode[]): number {
  return nodes.reduce(
    (sum, n) => sum + (n.type === "request" ? 1 : countRequests(n.children ?? [])),
    0,
  );
}

/** Parse a Postman Collection v2.x export (JSON text) into an importable tree. */
export function parsePostmanCollection(raw: string): ParsedPostmanCollection | null {
  let json: PostmanCollectionFile;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!json || typeof json !== "object" || !Array.isArray(json.item)) return null;

  const root = json.item.map(itemToNode);
  return {
    name: json.info?.name?.trim() || "Imported Collection",
    root,
    requestCount: countRequests(root),
  };
}
