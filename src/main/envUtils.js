const path = require('path');

/**
 * Returns a sanitized environment object for child processes.
 * Strips sensitive Electron/System variables and only keeps safe defaults.
 */
function getSafeEnv() {
  const safeKeys = [
    'PATH',
    'PATHEXT', // Windows
    'SYSTEMROOT', // Windows
    'TEMP',
    'TMP',
    'USERPROFILE', // Windows
    'HOME', // Unix
    'LANG',
    'LC_ALL',
    'TERM',
  ];

  const env = {};
  for (const key of safeKeys) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }

  // Add specific overrides for seec0de
  env.NO_COLOR = '1';
  env.FORCE_COLOR = '0';
  env.NODE_DISABLE_COLORS = '1';

  return env;
}

module.exports = { getSafeEnv };
