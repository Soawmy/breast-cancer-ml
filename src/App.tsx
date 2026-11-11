import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ImageWorkspace } from './components/ImageWorkspace';
import { PredictionSection } from './components/PredictionSection';
import { PipelineDiagramSection } from './components/PipelineDiagramSection';
import { ModelsUsedSection } from './components/ModelsUsedSection';
import { PipelineOutcome } from './utils/classification';
import {
  loadUniversalModel,
  executePipeline,
  createImageElement,
  PipelineProgress,
} from './utils/teachableMachine';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // Universal model startup state
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [modelErrorMessage, setModelErrorMessage] = useState<string | null>(null);

  // Uploaded image state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress>({ stage: 'idle' });
  const [pipelineOutcome, setPipelineOutcome] = useState<PipelineOutcome | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Synchronous guards to prevent duplicate/concurrent inference requests
  const isAnalyzingRef = useRef(false);
  const runIdRef = useRef(0);

  // Load ONLY the Universal Medical Imaging Classifier on initial mount.
  // Specialized models are lazy-loaded and cached on demand when routed.
  const initializeUniversalModel = async () => {
    setModelStatus('loading');
    setModelErrorMessage(null);
    try {
      await loadUniversalModel();
      setModelStatus('ready');
    } catch (err: unknown) {
      console.error('Failed to load Universal Medical Imaging Classifier:', err);
      setModelStatus('error');
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load universal classifier weights. Please check your internet connection.';
      setModelErrorMessage(message);
    }
  };

  useEffect(() => {
    void initializeUniversalModel();
  }, []);

  // Handle selecting or dropping an image
  const handleImageSelected = (file: File, dataUrl: string) => {
    if (isAnalyzingRef.current) return;
    runIdRef.current += 1;
    setImageFile(file);
    setImageSrc(dataUrl);
    setPipelineOutcome(null);
    setPredictionError(null);
    setPipelineProgress({ stage: 'idle' });
  };

  // Remove active image and reset state
  const handleRemoveImage = () => {
    if (isAnalyzingRef.current) return;
    runIdRef.current += 1;
    setImageSrc(null);
    setImageFile(null);
    setPipelineOutcome(null);
    setPredictionError(null);
    setPipelineProgress({ stage: 'idle' });
  };

  // Run universal-first two-stage routing and inference pipeline
  const runAnalysis = async () => {
    if (!imageSrc || modelStatus !== 'ready' || isAnalyzingRef.current) {
      return;
    }

    isAnalyzingRef.current = true;
    const activeRunId = ++runIdRef.current;

    setIsPredicting(true);
    setPredictionError(null);
    setPipelineProgress({ stage: 'identifying' });

    try {
      const imgElement = await createImageElement(imageSrc);
      const outcome = await executePipeline(imgElement, (progress) => {
        if (runIdRef.current === activeRunId) {
          setPipelineProgress(progress);
        }
      });

      if (runIdRef.current === activeRunId) {
        setPipelineOutcome(outcome);
      }
    } catch (err: unknown) {
      console.error('Prediction pipeline failed:', err);
      if (runIdRef.current === activeRunId) {
        const message =
          err instanceof Error
            ? err.message
            : 'An error occurred while analyzing the image. Please try again.';
        setPredictionError(message);
        setPipelineOutcome(null);
      }
    } finally {
      isAnalyzingRef.current = false;
      if (runIdRef.current === activeRunId) {
        setIsPredicting(false);
        setPipelineProgress({ stage: 'idle' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between">
      <div>
        <Header modelStatus={modelStatus} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
          {modelStatus === 'error' && (
            <div
              role="alert"
              className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{modelErrorMessage}</span>
              </div>
              <button
                type="button"
                onClick={initializeUniversalModel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors shrink-0 shadow-xs cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>Retry</span>
              </button>
            </div>
          )}

          <div className="w-full bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 shadow-xs">
            {pipelineOutcome ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="w-full">
                  <ImageWorkspace
                    imageSrc={imageSrc}
                    imageFile={imageFile}
                    onImageSelected={handleImageSelected}
                    onRemoveImage={handleRemoveImage}
                    isPredicting={isPredicting}
                  />
                </div>
                <div className="w-full">
                  <PredictionSection
                    hasImage={Boolean(imageSrc)}
                    isModelReady={modelStatus === 'ready'}
                    isPredicting={isPredicting}
                    progress={pipelineProgress}
                    onAnalyze={runAnalysis}
                    outcome={pipelineOutcome}
                    onTryAnother={handleRemoveImage}
                    predictionError={predictionError}
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto flex flex-col gap-6">
                <ImageWorkspace
                  imageSrc={imageSrc}
                  imageFile={imageFile}
                  onImageSelected={handleImageSelected}
                  onRemoveImage={handleRemoveImage}
                  isPredicting={isPredicting}
                />
                <PredictionSection
                  hasImage={Boolean(imageSrc)}
                  isModelReady={modelStatus === 'ready'}
                  isPredicting={isPredicting}
                  progress={pipelineProgress}
                  onAnalyze={runAnalysis}
                  outcome={null}
                  onTryAnother={handleRemoveImage}
                  predictionError={predictionError}
                />
              </div>
            )}
          </div>

          <PipelineDiagramSection />
          <ModelsUsedSection />

          <p className="text-center text-xs text-neutral-500 mt-8">
            For educational and research purposes only. Not intended for medical diagnosis.
          </p>
        </main>
      </div>
    </div>
  );
}
