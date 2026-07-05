const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const dotenv = require('dotenv');

function loadConfig(root = process.cwd()) {
  dotenv.config({ path: path.join(root, '.env'), quiet: true });
  dotenv.config({ path: path.join(root, 'docker/.env'), quiet: true });

  const configFile = process.env.CONFIG_FILE || path.join(root, process.env.NODE_ENV === 'test' ? 'config.test.yaml' : 'config.yaml');
  const resolvedPath = path.isAbsolute(configFile) ? configFile : path.join(root, configFile);
  const raw = existsSync(resolvedPath) ? readFileSync(resolvedPath, 'utf8') : '';
  return yaml.load(substituteEnv(raw)) || {};
}

function substituteEnv(input) {
  return input.replace(/\$\{([A-Z0-9_]+)(?:(:-|:\?)([^}]*))?\}/gi, (_match, name, operator, value) => {
    const envValue = process.env[name];
    if (envValue !== undefined && envValue !== '') return envValue;
    if (operator === ':-') return value || '';
    if (operator === ':?') throw new Error(value || `Required environment variable ${name} is not set`);
    return '';
  });
}

module.exports = { loadConfig };
