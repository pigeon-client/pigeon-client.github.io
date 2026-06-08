// Request types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type BodyType =
  | 'none'
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | 'text/xml'
  | 'application/octet-stream';

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

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'api-key';
  username: string;
  password: string;
  token: string;
  apiKey: string;
  apiValue: string;
  apiAddTo: 'header' | 'query';
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: number[];
  contentType: string;
  responseTime: number;
  size: number;
}

export interface Environment {
  id?: number;
  name: string;
  variables: Record<string, string>;
}

export interface HistoryItem {
  id?: number;
  name: string;
  method: HttpMethod;
  url: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  request: RequestConfig;
}
