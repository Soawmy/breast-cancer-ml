import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageWorkspace } from './components/ImageWorkspace';
import { PredictionSection } from './components/PredictionSection';
import { ClassificationResult } from './utils/classification';
import {
  loadAllModels,
  executePipeline,
  createImageElement,
  ModalityMode,
} from './utils/teachableMachine';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // Model state
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [modelErrorMessage, setModelErrorMessage] = useState<string | null>(null);

  // Uploaded image state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Modality mode: 'auto' | 'mammogram' | 'ultrasound'
  const [modality, setModality] = useState<ModalityMode>('auto');

  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionStage, setPredictionStage] = useState<'idle' | 'identifying' | 'classifying'>('idle');
  const [predictionResult, setPredictionResult] = useState<ClassificationResult | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Load all three Teachable Machine models on initial mount
  const initializeModels = async () => {
    setModelStatus('loading');
    setModelErrorMessage(null);
    try {
      await loadAllModels();
      setModelStatus('ready');
    } catch (err: any) {
      console.error('Failed to load Teachable Machine models:', err);
      setModelStatus('error');
      setModelErrorMessage(err.message || 'Failed to load model weights. Please check your internet connection.');
    }
  };

  useEffect(() => {
    initializeModels();
  }, []);

  // Handle selecting or dropping an image
  const handleImageSelected = (file: File, dataUrl: string) => {
    setImageFile(file);
    setImageSrc(dataUrl);
    // Clear previous predictions when a new image is selected
    setPredictionResult(null);
    setPredictionError(null);
  };

  // Remove active image
  const handleRemoveImage = () => {
    setImageSrc(null);
    setImageFile(null);
    setPredictionResult(null);
    setPredictionError(null);
    setPredictionStage('idle');
  };

  // Run routing and inference pipeline
  const handleAnalyze = async () => {
    if (!imageSrc || modelStatus !== 'ready' || isPredicting) {
      return;
    }

    setIsPredicting(true);
    setPredictionError(null);
    setPredictionStage(modality === 'auto' ? 'identifying' : 'classifying');

    try {
      // 1. Create and load HTMLImageElement for client-side tensor analysis
      const imgElement = await createImageElement(imageSrc);

      // 2. Execute pipeline with selected modality (auto, mammogram, or ultrasound)
      const result = await executePipeline(
        imgElement,
        (stage) => {
          setPredictionStage(stage);
        },
        modality
      );

      setPredictionResult(result);
    } catch (err: any) {
      console.error('Prediction failed:', err);
      setPredictionError(
        err.message || 'An error occurred while analyzing the image. Please try again.'
      );
    } finally {
      setIsPredicting(false);
      setPredictionStage('idle');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between">
      <div>
        {/* Header */}
        <Header modelStatus={modelStatus} />

        {/* Main Workspace */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
          {/* Model Loading Error Alert */}
          {modelStatus === 'error' && (
            <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{modelErrorMessage}</span>
              </div>
              <button
                type="button"
                onClick={initializeModels}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors shrink-0 shadow-sm"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}

          {/* Centered workspace container */}
          <div className="w-full bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 shadow-sm">
            {predictionResult ? (
              /* Desktop: Balanced 2-column layout with preview and results */
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
                    predictionStage={predictionStage}
                    modality={modality}
                    onModalityChange={setModality}
                    onAnalyze={handleAnalyze}
                    result={predictionResult}
                    onTryAnother={handleRemoveImage}
                    predictionError={predictionError}
                  />
                </div>
              </div>
            ) : (
              /* Single column centered workspace before prediction */
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
                  predictionStage={predictionStage}
                  modality={modality}
                  onModalityChange={setModality}
                  onAnalyze={handleAnalyze}
                  result={null}
                  onTryAnother={handleRemoveImage}
                  predictionError={predictionError}
                />
              </div>
            )}
          </div>

          {/* Short medical disclaimer below workspace */}
          <p className="text-center text-xs text-neutral-500 mt-8">
            For educational and research purposes only. Not intended for medical diagnosis.
          </p>
        </main>
      </div>
    </div>
  );
}
