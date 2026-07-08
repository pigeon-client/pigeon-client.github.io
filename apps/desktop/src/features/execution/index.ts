export { useApiRequest } from "./hooks/useApiRequest";
export type { HttpClient, HttpRequest } from "./ports/HttpClient";
export {
  resolveRequest,
  sendRequest,
  UnresolvedVariablesError,
} from "./services/requestService";
export type { ApiResponse } from "./types";
