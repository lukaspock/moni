const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    // eslint-plugin-react's auto-detection calls a `context.getFilename()`
    // API that ESLint 10's flat-config runtime no longer exposes the same
    // way, which crashes the `react/display-name` rule. Pin the version
    // explicitly instead of relying on auto-detect.
    settings: {
      react: {
        version: '19.2.3',
      },
    },
  },
  {
    ignores: [
      'dist/*',
      '.expo/*',
      'ios/*',
      'android/*',
      'node_modules/*',
      'coverage/*',
      // Deno edge functions (owned by `backend`): different runtime/module
      // resolution (URL imports), not part of this Expo app's lint scope.
      'supabase/**',
    ],
  },
]);
