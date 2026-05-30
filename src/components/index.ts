// Export all components from a single entry point
// Shell components — eagerly imported by App.tsx
export { AboutModal } from "./AboutModal";
export { DebugPanel } from "./DebugPanel";
export { ErrorBoundary } from "./ErrorBoundary";
export { Footer } from "./Footer";
export { Header } from "./Header";
export { default as StorageWarningBanner } from "./StorageWarningBanner";
export { default as VersionMismatchBanner } from "./VersionMismatchBanner";
// Route screens are NOT exported here — App.tsx lazy-imports them directly
// so Rolldown can split them into separate on-demand chunks.
// HostApiScreen is lazy-imported directly by App.tsx — not re-exported here
export { EndpointList, EndpointTester } from './host-api';
