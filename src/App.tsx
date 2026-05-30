import React, { useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppInsightsContext } from '@microsoft/applicationinsights-react-js';
import { reactPlugin } from './utils/appInsights';
import {
  VersionMismatchBanner,
  Header,
  DebugPanel,
  ErrorBoundary,
  Footer,
} from './components';

// Route-level screens are lazy-loaded so each becomes its own chunk.
// Shell components above stay eager (they render on every page).
const HomeScreen         = React.lazy(() => import('./components/HomeScreen'));
const HowToUseScreen     = React.lazy(() => import('./components/HowToUseScreen').then(m => ({ default: m.HowToUseScreen })));
const AboutScreen        = React.lazy(() => import('./components/AboutScreen').then(m => ({ default: m.AboutScreen })));
const JokeApiScreen      = React.lazy(() => import('./components/joke-api/JokeApiScreen').then(m => ({ default: m.JokeApiScreen })));
const JsonPlaceholderScreen = React.lazy(() => import('./components/json-placeholder/JsonPlaceholderScreen').then(m => ({ default: m.JsonPlaceholderScreen })));

const HostApiScreen = React.lazy(() => import('./components/host-api/HostApiScreen').then(m => ({ default: m.HostApiScreen })));
const ApiDocScreen  = React.lazy(() => import('./components/api-doc/ApiDocScreen').then(m => ({ default: m.ApiDocScreen })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

function App() {
  const [isDebugCollapsed, setIsDebugCollapsed] = useState(false);
  const [debugPanelWidth, setDebugPanelWidth] = useState(60);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      setDebugPanelWidth(Math.min(Math.max(newWidth, 20), 80));
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <ErrorBoundary>
      <AppInsightsContext.Provider value={reactPlugin}>
        <QueryClientProvider client={queryClient}>
          <Router basename={import.meta.env.BASE_URL}>
            <div className="app flex flex-col min-h-screen">
              <VersionMismatchBanner />
              <Header />
              <div className="flex flex-1" style={{ userSelect: isDragging ? 'none' : 'auto' }}>
                {/* Main content area */}
                <div
                  className="flex-shrink-0"
                  style={{
                    width: isDebugCollapsed ? 'calc(100% - 48px)' : `${100 - debugPanelWidth}%`,
                    minWidth: 0,
                    transition: isDragging ? 'none' : 'width 0.2s ease',
                  }}
                >
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[60vh]">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  }>
                    <Routes>
                    <Route path="/"          element={<HomeScreen />} />
                    <Route path="/how-to-use" element={<HowToUseScreen />} />
                    <Route path="/about"      element={<AboutScreen />} />

                    {/* /config now redirects — config lives in each section screen */}
                    <Route path="/config"             element={<Navigate to="/" replace />} />
                    <Route path="/conversation-config" element={<Navigate to="/" replace />} />
                    <Route path="/unified-config"      element={<Navigate to="/" replace />} />

                    <Route path="/host-api" element={<HostApiScreen />} />
                    <Route path="/api-docs" element={<ApiDocScreen />} />
                    <Route path="/joke-api" element={<JokeApiScreen />} />
                    <Route path="/json-placeholder" element={<JsonPlaceholderScreen />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  </Suspense>
                </div>

                {/* Resize handle */}
                {!isDebugCollapsed && (
                  <div
                    onMouseDown={handleMouseDown}
                    className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex-shrink-0 group relative"
                    style={{ cursor: 'col-resize' }}
                  >
                    <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-500/20" />
                  </div>
                )}

                {/* Debug panel */}
                <div
                  className="flex-shrink-0"
                  style={{
                    width: isDebugCollapsed ? '48px' : `${debugPanelWidth}%`,
                    transition: isDragging ? 'none' : 'width 0.2s ease',
                  }}
                >
                  <DebugPanel
                    isCollapsed={isDebugCollapsed}
                    onToggleCollapse={() => setIsDebugCollapsed((v) => !v)}
                  />
                </div>
              </div>
              <Footer />
            </div>
          </Router>
        </QueryClientProvider>
      </AppInsightsContext.Provider>
    </ErrorBoundary>
  );
}

export default App;