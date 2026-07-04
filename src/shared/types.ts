// Core request-shaping types shared across features
// (request-builder, execution, history, collections, import-export).

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type BodyType =
  | "none"
  | "application/json"
  | "application/x-www-form-urlencoded"
  | "multipart/form-data"
  | "text/plain"
  | "text/xml"
  | "application/octet-stream";

export interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
  isFile?: boolean;
  file?: File | null;
  fileName?: string;
}

export interface FileData {
  name: string;
  data: number[];
  type: string;
}

export interface AuthConfig {
  type: "none" | "basic" | "bearer" | "api-key";
  username: string;
  password: string;
  token: string;
  apiKey: string;
  apiValue: string;
  apiAddTo: "header" | "query";
}

export interface RequestConfig {
  id?: number;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: Header[];
  bodyType: BodyType;
  body: string;
  formData: KeyValue[];
  multipart: KeyValue[];
  file: File | null;
  auth: AuthConfig;
}
