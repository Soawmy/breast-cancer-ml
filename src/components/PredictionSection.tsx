import React from 'react';
import { Loader2 } from 'lucide-react';
import { ClassificationResult } from '../utils/classification';

interface PredictionSectionProps {
  hasImage: boolean;
  isModelReady: boolean;
  isPredicting: boolean;
  predictionStage: 'idle' | 'identifying' | 'classifying';
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
          {predictionError}
        </div>
      )}

      {/* If result is not yet available, show the Analyze button */}
      {!result ? (
        <div className="flex flex-col items-center sm:items-start w-full">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isButtonDisabled}
            className={`w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isButtonDisabled
                ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm'
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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Confidence Scores
              </h3>
              <span className="text-[11px] text-neutral-400">
                {result.modelName}
              </span>
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
