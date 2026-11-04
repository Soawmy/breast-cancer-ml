import React from 'react';

interface HeaderProps {
  modelStatus: 'loading' | 'ready' | 'error';
}

export function Header({ modelStatus }: HeaderProps) {
  return (
    <header className="w-full border-b border-neutral-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-neutral-900 tracking-tight">
          Breast Imaging Classifier
        </h1>
        <div className="flex items-center gap-2 text-xs">
          {modelStatus === 'loading' && (
            <span className="flex items-center gap-1.5 text-neutral-500">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Loading models
            </span>
          )}
          {modelStatus === 'ready' && (
            <span className="flex items-center gap-1.5 text-neutral-500">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Models ready
            </span>
          )}
          {modelStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              Model error
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
