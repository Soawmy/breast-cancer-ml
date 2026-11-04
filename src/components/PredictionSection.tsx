import React from 'react';
import { Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { ClassificationResult } from '../utils/classification';
import { ModalityMode } from '../utils/teachableMachine';

interface PredictionSectionProps {
  hasImage: boolean;
  isModelReady: boolean;
  isPredicting: boolean;
  predictionStage: 'idle' | 'identifying' | 'classifying';
  modality: ModalityMode;
  onModalityChange: (m: ModalityMode) => void;
  onAnalyze: () => void;
  result: ClassificationResult | null;
  onTryAnother: () => void;
  predictionError: string | null;
}

export function PredictionSection({
  hasImage,
  isModelReady,
  isPredicting,
  predictionStage,
  modality,
  onModalityChange,
  onAnalyze,
  result,
  onTryAnother,
  predictionError,
}: PredictionSectionProps) {
  const isButtonDisabled = !hasImage || !isModelReady || isPredicting;

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Prediction Error */}
      {predictionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs">
          <p className="font-semibold mb-1">Analysis Error</p>
          <p>{predictionError}</p>
          {modality === 'auto' && (
            <p className="mt-2 text-[11px] text-red-600">
              Tip: Switch the scan modality toggle below directly to <strong>Mammogram</strong> or <strong>Ultrasound</strong> to bypass auto-detection.
            </p>
          )}
        </div>
      )}

      {/* If result is not yet available, show modality selector & Analyze button */}
      {!result ? (
        <div className="flex flex-col gap-4 w-full">
          {/* Modality Selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700">
                Scan Modality
              </label>
              <span className="text-[11px] text-neutral-400">
                {modality === 'auto'
                  ? 'Auto-detects via Model 3'
                  : modality === 'mammogram'
                  ? 'Model: z8kfp45Hr'
                  : 'Model: KkUeH33bv'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 border border-neutral-200 rounded-md text-xs">
              <button
                type="button"
                onClick={() => onModalityChange('auto')}
                disabled={isPredicting}
                className={`py-1.5 px-2 rounded font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  modality === 'auto'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Auto-Detect</span>
              </button>
              <button
                type="button"
                onClick={() => onModalityChange('mammogram')}
                disabled={isPredicting}
                className={`py-1.5 px-2 rounded font-medium transition-all cursor-pointer ${
                  modality === 'mammogram'
                    ? 'bg-white text-blue-700 font-semibold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Mammogram
              </button>
              <button
                type="button"
                onClick={() => onModalityChange('ultrasound')}
                disabled={isPredicting}
                className={`py-1.5 px-2 rounded font-medium transition-all cursor-pointer ${
                  modality === 'ultrasound'
                    ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Ultrasound
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-start w-full">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isButtonDisabled}
              className={`w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isButtonDisabled
                  ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm cursor-pointer'
              }`}
            >
              {isPredicting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>
                    {predictionStage === 'identifying'
                      ? 'Identifying type...'
                      : predictionStage === 'classifying'
                      ? 'Classifying scan...'
                      : 'Analyzing Image...'}
                  </span>
                </>
              ) : (
                <span>Analyze Image</span>
              )}
            </button>
            {!hasImage && (
              <p className="text-xs text-neutral-400 mt-2">
                Select or drop an ultrasound or mammogram to enable analysis.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="flex flex-col gap-5 w-full pt-1">
          {/* Identified Imaging Type */}
          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                Identified Imaging Type
              </span>
              <span className="text-sm font-semibold text-neutral-900 mt-0.5">
                {result.imagingType.imagingType}
              </span>
            </div>
            <span className="text-xs font-mono font-medium text-neutral-600 bg-white px-2 py-1 rounded border border-neutral-200">
              {result.imagingType.formattedPercentage}
            </span>
          </div>

          {/* Prominently displayed predicted class & short description */}
          <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-lg">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Predicted Classification
            </span>
            <div className="mt-1 flex items-baseline justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                {result.topClass.displayName}
              </h2>
              <span className="text-sm sm:text-base font-semibold text-blue-600">
                {result.topClass.formattedPercentage}
              </span>
            </div>
            {result.description && (
              <p className="mt-2.5 pt-2.5 text-xs leading-relaxed text-neutral-600 border-t border-neutral-200/70">
                {result.description}
              </p>
            )}
          </div>

          {/* Confidence percentages for every class in the routed model */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Confidence Scores
              </h3>
              {result.modelUrl ? (
                <a
                  href={result.modelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  title="Verify on Google Teachable Machine"
                >
                  <span>{result.modelName}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-[11px] text-neutral-400">
                  {result.modelName}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              {result.allScores.map((score) => {
                const isTop = score.className === result.topClass.className;
                return (
                  <div key={score.className} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${isTop ? 'text-neutral-900' : 'text-neutral-600'}`}>
                        {score.displayName}
                      </span>
                      <span className={`font-mono ${isTop ? 'text-neutral-900 font-semibold' : 'text-neutral-500'}`}>
                        {score.formattedPercentage}
                      </span>
                    </div>
                    {/* Horizontal progress bar */}
                    <div className="w-full h-2 rounded-full bg-neutral-200/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isTop ? 'bg-blue-600' : 'bg-neutral-400'
                        }`}
                        style={{ width: `${Math.max(1, score.percentage)}%` }}
                        role="progressbar"
                        aria-valuenow={score.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${score.displayName} confidence`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action: Try Another Image */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onTryAnother}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 active:bg-neutral-100 transition-colors shadow-sm"
            >
              Try Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
