import React from 'react';

interface ErrorAlertProps {
  message: string;
  /** Optional secondary line shown below the main message in a smaller style. */
  hint?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, hint }) => (
  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
    {message}
    {hint && <span className="block text-xs mt-1 text-red-400">{hint}</span>}
  </p>
);
