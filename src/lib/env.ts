import { Environment } from '../types';

/**
 * Replace env variables in a string using {{varName}} syntax
 */
export function replaceEnvVariables(str: string, env: Environment | null): string {
  if (!env || !env.variables) return str;
  
  return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (env.variables.hasOwnProperty(trimmedKey)) {
      return env.variables[trimmedKey];
    }
    return match;
  });
}

/**
 * Parse env string to object (key=value pairs)
 */
export function parseEnvString(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = str.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      const value = trimmed.substring(equalIndex + 1).trim();
      if (key) {
        result[key] = value;
      }
    }
  }
  
  return result;
}
