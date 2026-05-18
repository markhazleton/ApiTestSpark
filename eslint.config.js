import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { 
    ignores: [
      'dist',
      'dist-ssr',
      'build',
      'out',
      'coverage',
      'node_modules',
      'jspm_packages',
      '.cache',
      '.vite',
      '.eslintcache',
      '*.config.js',
      '*.config.ts',
      'vite.config.ts',
      'postcss.config.js',
      'tailwind.config.js',
      'public/build-info.json',
      '*.tmp',
      '*.temp',
      '.tmp',
      '.temp',
      'src/analysis/**',
    ] 
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Critical React rules that Azure catches
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/static-components': 'error',
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],
    },
  },
)
