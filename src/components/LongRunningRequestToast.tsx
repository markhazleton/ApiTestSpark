import React from 'react';

interface LongRunningRequestToastProps {
  requestLabel: string;
  startedAt: number;
  onCancel: () => void;
}

export const LongRunningRequestToast: React.FC<LongRunningRequestToastProps> = ({
  requestLabel,
  startedAt,
  onCancel,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = React.useState(() => Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt]);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-amber-300 bg-white/95 shadow-2xl backdrop-blur-sm">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">Request taking longer than expected</p>
        <p className="mt-1 text-sm text-amber-800">{requestLabel} has been running for about {elapsedSeconds}s.</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-gray-700">You can keep waiting, or cancel the request if the browser starts feeling stuck.</p>
        <div className="mt-3 flex justify-end">
          <button
            onClick={onCancel}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            Cancel Request
          </button>
        </div>
      </div>
    </div>
  );
};