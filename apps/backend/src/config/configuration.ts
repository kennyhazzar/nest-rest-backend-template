import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as yaml from 'js-yaml';

type ConfigObject = Record<string, unknown>;

const DEFAULT_CONFIG_FILENAME = process.env.NODE_ENV === 'test' ? 'config.test.yaml' : 'config.yaml';

export function loadConfiguration(): ConfigObject {
  const configFile = process.env.CONFIG_FILE || DEFAULT_CONFIG_FILENAME;
  const resolvedPath = resolve(process.cwd(), configFile);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  const raw = readFileSync(resolvedPath, 'utf8');
  const substituted = substituteEnv(raw);
  return (yaml.load(substituted) || {}) as ConfigObject;
}

function substituteEnv(input: string): string {
  return input.replace(
    /\$\{([A-Z0-9_]+)(?:(:-|:\?)([^}]*))?\}/gi,
    (_match, name: string, operator?: string, value?: string) => {
      const envValue = process.env[name];

      if (envValue !== undefined && envValue !== '') {
        return envValue;
      }

      if (operator === ':-') {
        return value ?? '';
      }

      if (operator === ':?') {
        throw new Error(value || `Required environment variable ${name} is not set`);
      }

      return '';
    },
  );
}
