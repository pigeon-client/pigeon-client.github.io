import { parseUrl } from "@/shared/lib/url";
import type { AuthConfig, BodyType, HttpMethod, KeyValue, RequestConfig } from "@/shared/types";
import type { Auth, Body, FormField, RequestModel } from "../model/RequestModel";

const VALID_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function toMethod(raw: string): HttpMethod {
  const upper = raw.toUpperCase();
  return VALID_METHODS.has(upper) ? (upper as HttpMethod) : "GET";
}

function toBaseUrl(model: RequestModel): string {
  const url = model.url.raw || "";
  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) return url;
  return url.slice(0, queryIndex);
}

function toAuth(auth: Auth | undefined): AuthConfig {
  if (auth?.type === "basic") {
    return {
      type: "basic",
      username: auth.username ?? "",
      password: auth.password ?? "",
      token: "",
      apiKey: "",
      apiValue: "",
      apiAddTo: "header",
    };
  }

  if (auth?.type === "bearer") {
    return {
      type: "bearer",
      username: "",
      password: "",
      token: auth.token ?? "",
      apiKey: "",
      apiValue: "",
      apiAddTo: "header",
    };
  }

  if (auth?.type === "apikey") {
    return {
      type: "api-key",
      username: "",
      password: "",
      token: "",
      apiKey: auth.apiKeyHeader ?? "",
      apiValue: auth.apiKey ?? "",
      apiAddTo: "header",
    };
  }

  return {
    type: "none",
    username: "",
    password: "",
    token: "",
    apiKey: "",
    apiValue: "",
    apiAddTo: "header",
  };
}

function toKeyValue(field: FormField): KeyValue {
  return {
    key: field.key,
    value: field.file ?? field.value ?? "",
    enabled: field.enabled,
    isFile: field.type === "file",
    file: null,
    fileName: field.file,
  };
}

function bodyToRequestConfig(
  body: Body | undefined,
): Pick<RequestConfig, "body" | "bodyType" | "formData" | "multipart" | "file"> {
  if (!body || body.mode === "none") {
    return { body: "", bodyType: "none", formData: [], multipart: [], file: null };
  }

  if (body.mode === "json") {
    return {
      body: body.raw ?? "",
      bodyType: "application/json",
      formData: [],
      multipart: [],
      file: null,
    };
  }

  if (body.mode === "urlencoded") {
    return {
      body: "",
      bodyType: "application/x-www-form-urlencoded",
      formData: body.urlEncoded?.map(toKeyValue) ?? [],
      multipart: [],
      file: null,
    };
  }

  if (body.mode === "form-data") {
    return {
      body: "",
      bodyType: "multipart/form-data",
      formData: [],
      multipart: body.formData?.map(toKeyValue) ?? [],
      file: null,
    };
  }

  if (body.mode === "binary") {
    return {
      body: "",
      bodyType: "application/octet-stream",
      formData: [],
      multipart: [],
      file: null,
    };
  }

  const rawBodyType: BodyType = body.raw?.trim().startsWith("<") ? "text/xml" : "text/plain";
  return {
    body: body.raw ?? "",
    bodyType: rawBodyType,
    formData: [],
    multipart: [],
    file: null,
  };
}

function shouldKeepHeader(key: string, auth: Auth | undefined): boolean {
  if (key.toLowerCase() !== "authorization") return true;
  return auth?.type !== "basic" && auth?.type !== "bearer";
}

export function requestModelToRequestConfig(model: RequestModel): Partial<RequestConfig> {
  const auth = toAuth(model.auth);
  const body = bodyToRequestConfig(model.body);

  return {
    name: model.name,
    method: toMethod(model.method),
    url: toBaseUrl(model),
    params: model.url.query.map((param) => ({
      key: param.key,
      value: param.value,
      enabled: param.enabled,
    })),
    headers: model.headers
      .filter((header) => shouldKeepHeader(header.key, model.auth))
      .map((header) => ({
        key: header.key,
        value: header.value,
        enabled: header.enabled,
      })),
    auth,
    ...body,
  };
}

export function requestConfigToRequestModel(config: RequestConfig): RequestModel {
  const url = parseUrl(config.url);
  const query = config.params
    .filter((param) => param.key)
    .map((param) => ({
      key: param.key,
      value: param.value,
      enabled: param.enabled,
    }));

  return {
    id: config.id ? String(config.id) : crypto.randomUUID(),
    name: config.name,
    method: config.method,
    url: {
      raw: url,
      query,
      path: [],
    },
    headers: config.headers,
    cookies: [],
    auth: {
      type:
        config.auth.type === "api-key"
          ? "apikey"
          : config.auth.type === "none"
            ? "none"
            : config.auth.type,
      username: config.auth.username,
      password: config.auth.password,
      token: config.auth.token,
      apiKey: config.auth.apiValue,
      apiKeyHeader: config.auth.apiKey,
    },
    body: {
      mode:
        config.bodyType === "application/json"
          ? "json"
          : config.bodyType === "application/x-www-form-urlencoded"
            ? "urlencoded"
            : config.bodyType === "multipart/form-data"
              ? "form-data"
              : config.bodyType === "application/octet-stream"
                ? "binary"
                : config.bodyType === "none"
                  ? "none"
                  : "raw",
      raw: config.body,
      formData: config.multipart.map((field) => ({
        key: field.key,
        value: field.value,
        file: field.fileName,
        type: field.isFile ? "file" : "text",
        enabled: field.enabled,
      })),
      urlEncoded: config.formData.map((field) => ({
        key: field.key,
        value: field.value,
        type: "text",
        enabled: field.enabled,
      })),
    },
    options: {
      followRedirects: true,
      compressed: false,
      insecure: false,
    },
  };
}
