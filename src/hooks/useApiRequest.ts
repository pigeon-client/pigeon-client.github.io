import { invoke } from '@tauri-apps/api/core';
import { RequestConfig, ApiResponse } from '../types';
import { parseUrl } from '../lib/url';
import { replaceEnvVariables } from '../lib/env';
import { useEnvStore } from '../store/envStore';

export function useApiRequest() {
  const activeEnv = useEnvStore((state) => state.activeEnv);

  const sendRequest = async (config: RequestConfig): Promise<ApiResponse> => {
    let url = parseUrl(config.url);
    url = replaceEnvVariables(url, activeEnv);

    // Append query params from the params editor
    const activeParams = config.params?.filter((p) => p.enabled && p.key) ?? [];
    if (activeParams.length > 0) {
      const separator = url.includes('?') ? '&' : '?';
      const queryString = activeParams
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(replaceEnvVariables(p.value, activeEnv))}`)
        .join('&');
      url += separator + queryString;
    }

    const headers = config.headers
      .filter((h) => h.enabled && h.key)
      .map((h) => ({
        key: h.key,
        value: replaceEnvVariables(h.value, activeEnv),
      }));

    // Apply auth
    if (config.auth.type === 'basic' && config.auth.username) {
      const encoded = btoa(`${config.auth.username}:${config.auth.password}`);
      headers.push({ key: 'Authorization', value: `Basic ${encoded}` });
    } else if (config.auth.type === 'bearer' && config.auth.token) {
      headers.push({ key: 'Authorization', value: `Bearer ${config.auth.token}` });
    } else if (config.auth.type === 'api-key' && config.auth.apiKey && config.auth.apiValue) {
      if (config.auth.apiAddTo === 'header') {
        headers.push({ key: config.auth.apiKey, value: config.auth.apiValue });
      } else {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}${encodeURIComponent(config.auth.apiKey)}=${encodeURIComponent(config.auth.apiValue)}`;
      }
    }

    // For multipart with files, use browser's fetch + FormData
    if (config.bodyType === 'multipart/form-data') {
      return sendMultipartRequest(config, url, headers);
    }

    let body: string | null = null;
    if (config.bodyType === 'application/json' && config.body) {
      body = replaceEnvVariables(config.body, activeEnv);
    } else if (config.bodyType === 'text/plain' || config.bodyType === 'text/xml') {
      body = replaceEnvVariables(config.body, activeEnv);
    } else if (config.bodyType === 'application/x-www-form-urlencoded') {
      const params = new URLSearchParams();
      config.formData
        .filter((f) => f.enabled && f.key)
        .forEach((f) => {
          params.append(f.key, replaceEnvVariables(f.value, activeEnv));
        });
      body = params.toString();
    } else if (config.bodyType === 'application/octet-stream' && config.file) {
      const arrayBuffer = await config.file.arrayBuffer();
      body = Array.from(new Uint8Array(arrayBuffer)).join(',');
    }

    const startTime = performance.now();

    const response = await invoke<ApiResponse>('send_api_request', {
      method: config.method,
      url,
      headers,
      body,
      bodyType: config.bodyType,
    });

    const endTime = performance.now();

    return {
      ...response,
      responseTime: Math.round(endTime - startTime),
    };
  };

  return { sendRequest };
}

async function sendMultipartRequest(
  config: RequestConfig,
  url: string,
  headers: { key: string; value: string }[],
): Promise<ApiResponse> {
  const formData = new FormData();

  for (const field of config.multipart) {
    if (!field.enabled || !field.key) continue;
    if (field.isFile && field.file) {
      formData.append(field.key, field.file);
    } else {
      const value = replaceEnvVariables(field.value, activeEnvStore());
      formData.append(field.key, value);
    }
  }

  const startTime = performance.now();

  try {
    const res = await fetch(url, {
      method: config.method,
      headers: headers.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {} as Record<string, string>),
      body: formData,
    });

    const endTime = performance.now();
    const bodyBytes = new Uint8Array(await res.arrayBuffer());

    const respHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => { respHeaders[key] = value; });

    return {
      status: res.status,
      statusText: res.statusText,
      headers: respHeaders,
      body: Array.from(bodyBytes),
      contentType: respHeaders['content-type'] || 'application/octet-stream',
      responseTime: Math.round(endTime - startTime),
      size: bodyBytes.length,
    };
  } catch (err) {
    return {
      status: 0,
      statusText: String(err),
      headers: {},
      body: [],
      contentType: 'text/plain',
      responseTime: 0,
      size: 0,
    };
  }
}

function activeEnvStore() {
  return useEnvStore.getState().activeEnv;
}
