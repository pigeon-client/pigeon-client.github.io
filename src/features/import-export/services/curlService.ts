import type { RequestConfig } from "@/shared/types";
import { importCurl } from "./curlImporter";
import { requestModelToRequestConfig } from "./requestModelAdapter";

export function parseCurl(input: string): Partial<RequestConfig> | null {
  const model = importCurl(input);
  return model ? requestModelToRequestConfig(model) : null;
}
