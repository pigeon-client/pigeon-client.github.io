import type { RequestConfig } from "@/shared/types";
import { requestModelToRequestConfig } from "./requestModelAdapter";

export async function parseCurl(input: string): Promise<Partial<RequestConfig> | null> {
  const { importCurl } = await import("./curlImporter");
  const model = await importCurl(input);
  return model ? requestModelToRequestConfig(model) : null;
}
