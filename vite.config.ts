import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function matchesPackage(id: string, packages: string[]) {
  return packages.some((packageName) =>
    id.includes(`/node_modules/${packageName}/`) ||
    id.includes(`\\node_modules\\${packageName}\\`),
  )
}

function isApplicationInsightsAnnotationWarning(warning: { code?: string; id?: string }) {
  return warning.code === 'INVALID_ANNOTATION' &&
    matchesPackage(warning.id ?? '', [
      '@microsoft/applicationinsights-web',
      '@microsoft/applicationinsights-core-js',
    ]);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'src/public',
  // Default to the NuGet embedded path. Set VITE_BASE_PATH=/ for standalone SWA builds.
  base: process.env.VITE_BASE_PATH ?? '/api-test-spark/',
  server: {
    port: 5151,
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // Developer tool — main app chunk contains many admin screens
    rollupOptions: {
      onwarn(warning, warn) {
        // Application Insights 3.4.x emits misplaced pure annotations in its ES5 build.
        // Rolldown ignores them safely; keep the build output actionable until upstream fixes it.
        if (isApplicationInsightsAnnotationWarning(warning)) return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          // Keep major third-party dependencies in stable vendor bundles.
          if (matchesPackage(id, ['react', 'react-dom', 'react-router-dom'])) {
            return 'vendor-react'
          }

          if (matchesPackage(id, ['zustand', '@tanstack/react-query'])) {
            return 'vendor-state'
          }

          if (
            matchesPackage(id, [
              '@microsoft/applicationinsights-react-js',
              '@microsoft/applicationinsights-web',
            ])
          ) {
            return 'vendor-insights'
          }

          return undefined
        },
      },
    },
  },
})
