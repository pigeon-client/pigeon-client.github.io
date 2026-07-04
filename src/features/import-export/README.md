# import-export

cURL in and out.

## Public API (`index.ts`)
- `ImportModal`, `ExportCurlModal`
- `parseCurl(text)` — cURL → `Partial<RequestConfig>` (via `curlconverter`)
- `generateCurl(config)` — `RequestConfig` → cURL string

## Extend
Add a format (HTTPie, fetch) as a new `services/` parser + `lib/` generator, exported
from the barrel.
