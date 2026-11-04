import React, { useState } from 'react';
import { ExternalLink, Info, X, CheckCircle2 } from 'lucide-react';
import { MODEL_URLS } from '../utils/teachableMachine';

interface HeaderProps {
  modelStatus: 'loading' | 'ready' | 'error';
}

export function Header({ modelStatus }: HeaderProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <header className="w-full border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Breast Imaging Classifier
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {modelStatus === 'loading' && (
              <span className="flex items-center gap-1.5 text-neutral-500">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Loading models
              </span>
            )}
            {modelStatus === 'ready' && (
              <span className="flex items-center gap-1.5 text-neutral-600">
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

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-medium transition-colors cursor-pointer"
              title="Inspect connected Teachable Machine models"
            >
              <Info className="h-3.5 w-3.5 text-neutral-500" />
              <span>Model Links</span>
            </button>
          </div>
        </div>
      </header>

      {/* Connected Models Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-lg w-full p-6 text-neutral-900">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-semibold">Connected Teachable Machine Models</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
              These are the active machine learning models loaded via TensorFlow.js in this application. You can verify and inspect each live model directly on Google Teachable Machine:
            </p>

            <div className="mt-4 flex flex-col gap-3">
              {/* Mammogram Model */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-900">1. Breast Mammogram Classifier</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-medium">
                    Active
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-neutral-600 truncate">
                  {MODEL_URLS.mammogram}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  Classes: <span className="font-mono text-neutral-700">benign, malignant, normal</span>
                </div>
                <a
                  href={MODEL_URLS.mammogram}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Open model on Google Teachable Machine <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Ultrasound Model */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-900">2. Breast Ultrasound Classifier</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">
                    Active
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-neutral-600 truncate">
                  {MODEL_URLS.ultrasound}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  Classes: <span className="font-mono text-neutral-700">benign, malignant, normal</span>
                </div>
                <a
                  href={MODEL_URLS.ultrasound}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Open model on Google Teachable Machine <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Modality Router */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-900">3. Imaging Modality Detector</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded font-medium">
                    Router
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-neutral-600 truncate">
                  {MODEL_URLS.imagingType}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  Classes: <span className="font-mono text-neutral-700">Mammogram, Ultrasound</span>
                </div>
                <a
                  href={MODEL_URLS.imagingType}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Open model on Google Teachable Machine <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-neutral-800"
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
