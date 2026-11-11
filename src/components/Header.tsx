import React, { useState, useEffect } from 'react';
import { ExternalLink, Info, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { UNIVERSAL_MODEL_SPEC, SPECIALIZED_MODEL_LIST } from '../utils/classification';
import { isModelCached } from '../utils/teachableMachine';

interface HeaderProps {
  modelStatus: 'loading' | 'ready' | 'error';
}

export function Header({ modelStatus }: HeaderProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  return (
    <>
      <header className="w-full border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <h1 className="text-[13px] sm:text-sm font-semibold text-neutral-900 tracking-tight whitespace-nowrap shrink-0">
            Medicall
            <span className="hidden sm:inline font-normal text-neutral-500">
              {' '}
              — Universal Medical Image Classifier
            </span>
          </h1>

          <div className="flex items-center gap-3 sm:gap-4 text-xs shrink-0">
            {modelStatus === 'loading' && (
              <span className="inline-flex items-center gap-1.5 text-neutral-500 whitespace-nowrap shrink-0">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" aria-hidden="true" />
                <span className="hidden sm:inline">Loading universal model</span>
                <span className="sm:hidden">Loading</span>
              </span>
            )}
            {modelStatus === 'ready' && (
              <span className="inline-flex items-center gap-1.5 text-neutral-600 whitespace-nowrap shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span className="hidden sm:inline">Classifier ready</span>
                <span className="sm:hidden">Ready</span>
              </span>
            )}
            {modelStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-red-700 font-medium whitespace-nowrap shrink-0">
                <AlertCircle className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
                <span className="hidden sm:inline">Model error</span>
                <span className="sm:hidden">Error</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
              title="Inspect connected Teachable Machine models"
            >
              <Info className="h-3.5 w-3.5 text-neutral-500 shrink-0" aria-hidden="true" />
              <span>Model Links</span>
            </button>
          </div>
        </div>
      </header>

      {/* Connected Models Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="connected-models-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-2xl w-full p-6 text-neutral-900 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <h2 id="connected-models-title" className="text-base font-semibold">
                  Connected Teachable Machine Models
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 mt-3 leading-relaxed shrink-0">
              Medicall uses a two-stage TensorFlow.js pipeline running locally in your browser. Stage 1 identifies the
              imaging category, an on-device domain guard (MobileNetV2 + COCO-SSD) screens out unrelated everyday
              pictures, and Stage 2 lazy-loads and caches only the matching specialized classifier:
            </p>

            <div className="mt-4 divide-y divide-neutral-200 border border-neutral-200 rounded-md bg-neutral-50/70 overflow-y-auto">
              {/* Stage 1 Universal Model */}
              <div className="p-3.5 bg-white">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-neutral-900">
                    Stage 1 · {UNIVERSAL_MODEL_SPEC.modelName}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 whitespace-nowrap shrink-0">
                    {isModelCached('universal') ? 'Loaded & cached' : 'Primary router'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-neutral-600 truncate">
                  {UNIVERSAL_MODEL_SPEC.modelUrl}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  Classes:{' '}
                  <span className="font-mono text-neutral-700">
                    {UNIVERSAL_MODEL_SPEC.classes.join(', ')}
                  </span>
                </div>
                <a
                  href={UNIVERSAL_MODEL_SPEC.modelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                >
                  Open model on Google Teachable Machine{' '}
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              </div>

              {/* Stage 2 Specialized Models */}
              {SPECIALIZED_MODEL_LIST.map((spec, idx) => {
                const cached = isModelCached(spec.category);
                return (
                  <div key={spec.category} className="p-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-900">
                        Stage 2.{idx + 1} · {spec.modelName}
                      </span>
                      <span className="text-[11px] text-neutral-500 whitespace-nowrap shrink-0">
                        {cached ? 'Cached' : `Route: ${spec.category}`}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-neutral-600 truncate">
                      {spec.modelUrl}
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-500">
                      Trigger:{' '}
                      <span className="font-mono text-neutral-700">{spec.category}</span>
                      {' · '}
                      Classes:{' '}
                      <span className="font-mono text-neutral-700">{spec.classes.join(', ')}</span>
                    </div>
                    <a
                      href={spec.modelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      Open model on Google Teachable Machine{' '}
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
