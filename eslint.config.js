// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  ...expoConfig,
  prettier,
  {
    ignores: ['dist/*', 'node_modules/*', 'supabase/**', 'scripts/**', 'maestro/**', 'coverage/**'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      // Reanimated shared values mutate `.value` by design.
      'react-hooks/immutability': 'off',
      // Auth/session bootstrap and screen data loaders use effects with setState.
      'react-hooks/set-state-in-effect': 'off',
      // Avoid false positives until React Compiler lint rules stabilize with RN.
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
]);
