import React, { useState } from 'react';
import {
  Loader2,
  ExternalLink,
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import {
  PipelineOutcome,
  UNIVERSAL_MODEL_SPEC,
  SPECIALIZED_MODEL_LIST,
  CLOSED_SET_SCOPE_NOTE,
} from '../utils/classification';
import { PipelineProgress } from '../utils/teachableMachine';

interface PredictionSectionProps {
  hasImage: boolean;
  isModelReady: boolean;
  isPredicting: boolean;
  progress: PipelineProgress;
  onAnalyze: () => void;
  outcome: PipelineOutcome | null;
  onTryAnother: () => void;
  predictionError: string | null;
}

export function PredictionSection({
  hasImage,
  isModelReady,
  isPredicting,
  progress,
  onAnalyze,
  outcome,
  onTryAnother,
  predictionError,
}: PredictionSectionProps) {
  const [showUniversalScores, setShowUniversalScores] = useState(false);
  const [showUnrelatedStage1, setShowUnrelatedStage1] = useState(false);
  const isButtonDisabled = !hasImage || !isModelReady || isPredicting;

  const getProgressLabel = (): string => {
    if (progress.stage === 'identifying') {
      return 'Stage 1: Identifying imaging category...';
    }
    if (progress.stage === 'verifying_domain') {
      return 'Checking medical image domain...';
    }
    if (progress.stage === 'loading_specialized') {
      return progress.modelName
        ? `Stage 2: Loading ${progress.modelName}...`
        : 'Stage 2: Loading specialized model...';
    }
    if (progress.stage === 'classifying') {
      return progress.modelName
        ? `Stage 2: Running ${progress.modelName}...`
        : 'Stage 2: Running specialized classifier...';
    }
    return 'Analyzing Image...';
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Prediction / Network / Model Loading Error */}
      {predictionError && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs flex flex-col gap-2.5"
        >
          <div>
            <p className="font-semibold mb-1">Analysis Error</p>
            <p className="leading-relaxed">{predictionError}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasImage && isModelReady && (
              <button
                type="button"
                onClick={onAnalyze}
                disabled={isPredicting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>Retry Analysis</span>
              </button>
            )}
            {hasImage && (
              <button
                type="button"
                onClick={onTryAnother}
                disabled={isPredicting}
                className="px-3 py-1.5 rounded bg-white border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Upload Another Image
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pre-prediction Action */}
      {!outcome ? (
        <div className="flex flex-col items-center sm:items-start gap-2.5 w-full">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isButtonDisabled}
            className={`w-full sm:w-auto min-w-[180px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
              isButtonDisabled
                ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs cursor-pointer'
            }`}
          >
            {isPredicting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" aria-hidden="true" />
                <span>{getProgressLabel()}</span>
              </>
            ) : (
              <span>Analyze Image</span>
            )}
          </button>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {!hasImage
              ? 'Select or drop a medical image to run two-stage universal classification.'
              : 'Stage 1 identifies the category and screens out unrelated non-medical images before Stage 2 runs.'}
          </p>
        </div>
      ) : outcome.status === 'unrelated' ? (
        /* Unrelated / Non-Medical Picture Detected (Specialized disease model blocked) */
        <div className="flex flex-col w-full divide-y divide-neutral-200">
          <div className="pb-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-950">
              <div className="flex items-start gap-2.5">
                <Ban className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold text-amber-950">
                      Unrelated Image Detected — Specialized Model Not Run
                    </h2>
                    <span className="text-xs font-mono font-semibold text-amber-800 tabular-nums">
                      {outcome.unrelated.formattedConfidence}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-white/80 border border-amber-200/80 text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="text-neutral-600">Detected non-medical subject</span>
                    <span className="font-semibold text-neutral-900">
                      {outcome.unrelated.detectedSubject}{' '}
                      <span className="font-normal text-neutral-500">
                        ({outcome.unrelated.subjectCategory})
                      </span>
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-amber-900">
                    {outcome.unrelated.explanation}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="py-3.5 flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
              Supported Medical Modalities
            </span>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {SPECIALIZED_MODEL_LIST.map((m) => m.categoryDisplayName).join(' · ')}
            </p>

            {outcome.unrelated.allUniversalScores.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowUnrelatedStage1((prev) => !prev)}
                  aria-expanded={showUnrelatedStage1}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  <span>
                    {showUnrelatedStage1
                      ? 'Hide raw Stage 1 closed-set scores'
                      : 'View raw Stage 1 closed-set scores'}
                  </span>
                  {showUnrelatedStage1 ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>

                {showUnrelatedStage1 && (
                  <div className="mt-2.5 pt-2.5 border-t border-neutral-100 flex flex-col gap-1.5">
                    <p className="text-[11px] text-neutral-500">
                      Raw Universal Classifier probabilities prior to non-medical rejection (Stage 2 was not executed):
                    </p>
                    {outcome.unrelated.allUniversalScores.map((score) => (
                      <div key={score.className} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="font-mono text-neutral-600">{score.className}</span>
                        <span className="font-mono tabular-nums text-neutral-700">
                          {score.formattedPercentage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center">
            <button
              type="button"
              onClick={onTryAnother}
              disabled={isPredicting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
            >
              Upload Another Image
            </button>
          </div>
        </div>
      ) : outcome.status === 'uncertain' ? (
        /* Uncertain / Low-Confidence Universal Result (Specialized model intentionally skipped) */
        <div className="flex flex-col w-full divide-y divide-neutral-200">
          <div className="pb-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md text-amber-950">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-sm font-semibold text-amber-950">
                    Image Category Uncertain — Specialized Model Not Run
                  </h2>
                  <p className="text-xs leading-relaxed text-amber-900">
                    {outcome.universal.explanation}
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Uncertain results are never presented as a diagnosis. Upload a clearer image from one of the 7 supported modalities.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stage 1 Confidence Scores Breakdown */}
          {outcome.universal.allScores.length > 0 && (
            <div className="py-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Stage 1 · Universal Classifier Scores
                </h3>
                <a
                  href={UNIVERSAL_MODEL_SPEC.modelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline whitespace-nowrap"
                >
                  <span>{UNIVERSAL_MODEL_SPEC.modelName}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              </div>
              <div className="flex flex-col gap-2">
                {outcome.universal.allScores.map((score, idx) => (
                  <div key={score.className} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={idx === 0 ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-600'}>
                        {score.displayName}{' '}
                        <span className="font-mono text-[11px] text-neutral-400">({score.className})</span>
                      </span>
                      <span
                        className={`font-mono tabular-nums ${
                          idx === 0 ? 'text-amber-700 font-semibold' : 'text-neutral-500'
                        }`}
                      >
                        {score.formattedPercentage}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          idx === 0 ? 'bg-amber-500' : 'bg-neutral-300'
                        }`}
                        style={{
                          width: `${score.percentage}%`,
                          minWidth: score.percentage > 0 ? '4px' : '0px',
                        }}
                        role="progressbar"
                        aria-valuenow={score.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${score.className} universal confidence`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Another Image CTA */}
          <div className="pt-4 flex items-center">
            <button
              type="button"
              onClick={onTryAnother}
              disabled={isPredicting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
            >
              Upload Another Image
            </button>
          </div>
        </div>
      ) : (
        /* Confident Two-Stage Results View */
        <div className="flex flex-col w-full divide-y divide-neutral-200">
          {/* Stage 1: Detected Category & Universal Confidence */}
          <div className="pb-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                  Stage 1 · Detected Image Category
                </span>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-neutral-900">
                    {outcome.result.universal.categoryDisplayName}
                  </span>
                  <span className="font-mono text-xs text-neutral-500">
                    ({outcome.result.universal.category})
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[11px] text-neutral-500">Universal confidence</span>
                <span className="text-sm font-mono font-semibold tabular-nums text-neutral-900">
                  {outcome.result.universal.formattedPercentage}
                </span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowUniversalScores((prev) => !prev)}
                aria-expanded={showUniversalScores}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                <span>
                  {showUniversalScores
                    ? 'Hide Stage 1 category scores'
                    : `View all ${outcome.result.universal.allScores.length} Stage 1 category scores`}
                </span>
                {showUniversalScores ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>

              {showUniversalScores && (
                <div className="mt-2.5 pt-2.5 border-t border-neutral-100 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-0.5">
                    <span>Universal Classifier Distribution</span>
                    <a
                      href={UNIVERSAL_MODEL_SPEC.modelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <span>Model 9v7G7hmAY</span>
                      <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                    </a>
                  </div>
                  {outcome.result.universal.allScores.map((score) => {
                    const isTop = score.className === outcome.result.universal.category;
                    return (
                      <div key={score.className} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className={isTop ? 'font-semibold text-neutral-900 font-mono' : 'text-neutral-600 font-mono'}>
                          {score.className}
                        </span>
                        <div className="flex items-center gap-2 min-w-[110px]">
                          <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isTop ? 'bg-blue-600' : 'bg-neutral-300'}`}
                              style={{
                                width: `${score.percentage}%`,
                                minWidth: score.percentage > 0 ? '3px' : '0px',
                              }}
                            />
                          </div>
                          <span className="font-mono tabular-nums text-neutral-700 w-11 text-right">
                            {score.formattedPercentage}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Stage 2: Specialized Model Prediction & Explanation */}
          <div className={`py-4 transition-opacity ${isPredicting ? 'opacity-60' : 'opacity-100'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                Stage 2 · Specialized Prediction
              </span>
              {outcome.result.isLowConfidence && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                  <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>Uncertain confidence</span>
                </span>
              )}
            </div>

            <div className="mt-1.5 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                  {outcome.result.topClass.displayName}
                </h2>
                {outcome.result.topClass.displayName !== outcome.result.topClass.className && (
                  <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                    Model class: {outcome.result.topClass.className}
                  </p>
                )}
              </div>
              <span
                className={`text-lg sm:text-xl font-mono font-semibold tabular-nums shrink-0 ${
                  outcome.result.isLowConfidence ? 'text-amber-700' : 'text-blue-600'
                }`}
              >
                {outcome.result.topClass.formattedPercentage}
              </span>
            </div>

            {outcome.result.confidenceNote && (
              <div
                role="note"
                className="mt-3 p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] leading-relaxed text-amber-900"
              >
                {outcome.result.confidenceNote}
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2 text-xs sm:text-[13px] leading-relaxed text-neutral-600">
              {outcome.result.description && <p>{outcome.result.description}</p>}
              <p className="text-xs text-neutral-500">{outcome.result.pipelineSummary}</p>
            </div>
          </div>

          {/* Stage 2: Specialized Model Confidence Scores */}
          <div className={`py-4 flex flex-col gap-3 transition-opacity ${isPredicting ? 'opacity-60' : 'opacity-100'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Specialized Model Confidence Scores
              </h3>
              <a
                href={outcome.result.modelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline whitespace-nowrap"
                title="Verify on Google Teachable Machine"
              >
                <span>{outcome.result.modelName}</span>
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              </a>
            </div>
            <div className="flex flex-col gap-2.5">
              {outcome.result.allScores.map((score) => {
                const isTop = score.className === outcome.result.topClass.className;
                const showRaw = score.displayName !== score.className;
                return (
                  <div key={score.className} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className={isTop ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-600'}>
                        {score.displayName}
                        {showRaw && (
                          <span className="ml-1.5 font-mono text-[11px] font-normal text-neutral-400">
                            ({score.className})
                          </span>
                        )}
                      </span>
                      <span
                        className={`font-mono tabular-nums ${
                          isTop ? 'text-neutral-900 font-semibold' : 'text-neutral-500'
                        }`}
                      >
                        {score.formattedPercentage}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isTop
                            ? outcome.result.isLowConfidence
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                            : 'bg-neutral-300'
                        }`}
                        style={{
                          width: `${score.percentage}%`,
                          minWidth: score.percentage > 0 ? '4px' : '0px',
                        }}
                        role="progressbar"
                        aria-valuenow={score.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${score.className} confidence`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Try Another Image Action & Scope Notice */}
          <div className="pt-4 flex flex-col gap-3">
            <p className="text-[11px] leading-relaxed text-neutral-500">
              {CLOSED_SET_SCOPE_NOTE}
            </p>
            <div className="flex items-center">
              <button
                type="button"
                onClick={onTryAnother}
                disabled={isPredicting}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50 transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
              >
                Upload Another Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
