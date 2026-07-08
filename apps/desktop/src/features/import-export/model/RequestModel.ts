export interface RequestModel {
  id: string;
  name?: string;
  method: string;
  url: RequestUrl;
  headers: Header[];
  cookies: Cookie[];
  auth?: Auth;
  body?: Body;
  options: RequestOptions;
}

export interface RequestUrl {
  raw: string;
  protocol?: string;
  host?: string;
  port?: number;
  path: string[];
  query: QueryParam[];
}

export interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

export interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Cookie {
  key: string;
  value: string;
}

export interface Auth {
  type: "none" | "basic" | "bearer" | "apikey" | "digest" | "oauth2";
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

export interface Body {
  mode: "none" | "raw" | "json" | "form-data" | "urlencoded" | "binary";
  raw?: string;
  formData?: FormField[];
  urlEncoded?: FormField[];
  binaryFile?: string;
}

export interface FormField {
  key: string;
  value?: string;
  file?: string;
  type: "text" | "file";
  enabled: boolean;
}

export interface RequestOptions {
  followRedirects: boolean;
  compressed: boolean;
  insecure: boolean;
  timeout?: number;
  connectTimeout?: number;
  proxy?: string;
  userAgent?: string;
}
