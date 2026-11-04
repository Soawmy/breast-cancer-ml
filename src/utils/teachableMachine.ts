import {
  RawPrediction,
  ClassificationResult,
  ImagingTypeResult,
  determineImagingType,
  buildClassificationResult,
} from './classification';

export const MODEL_URLS = {
  // Breast Ultrasound Classifier
  ultrasound: 'https://teachablemachine.withgoogle.com/models/KkUeH33bv/',
  // Breast Mammogram Classifier
  mammogram: 'https://teachablemachine.withgoogle.com/models/z8kfp45Hr/',
  // Imaging Type Classifier
  imagingType: 'https://teachablemachine.withgoogle.com/models/4J1sLOtpZ/',
} as const;

export interface ModelMetadata {
  modelName?: string;
  labels: string[];
  imageSize?: number;
  tfjsVersion?: string;
}

export interface LoadedModelBundle {
  model: any;
  metadata: ModelMetadata;
}

declare global {
  interface Window {
    tf?: any;
    tmImage?: {
      load: (modelURL: string, metadataURL: string) => Promise<any>;
      [key: string]: any;
    };
  }
}

// Memory cache for initialized models
const modelCache: {
  ultrasound: LoadedModelBundle | null;
  mammogram: LoadedModelBundle | null;
  imagingType: LoadedModelBundle | null;
} = {
  ultrasound: null,
  mammogram: null,
  imagingType: null,
};

let loadingPromise: Promise<void> | null = null;

/**
 * Ensures TensorFlow.js and Teachable Machine libraries are loaded in window
 */
async function ensureLibrariesLoaded(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (window.tmImage && window.tf) {
    return;
  }

  const loadScript = (src: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id) as HTMLScriptElement;
      if (existing) {
        if ((existing as any).loaded) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', (e) => reject(new Error(`Failed to load ${src}: ${e}`)), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        (script as any).loaded = true;
        resolve();
      };
      script.onerror = (err) => reject(new Error(`Failed to load script ${src}: ${err}`));
      document.head.appendChild(script);
    });
  };

  if (!window.tf) {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js', 'tfjs-cdn');
  }
  if (!window.tmImage) {
    await loadScript(
      'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js',
      'tm-image-cdn'
    );
  }
}

/**
 * Helper to fetch metadata and weights for a specific Teachable Machine model URL
 */
async function loadSingleModel(baseURL: string): Promise<LoadedModelBundle> {
  const modelURL = `${baseURL}model.json`;
  const metadataURL = `${baseURL}metadata.json`;

  const metaResponse = await fetch(metadataURL);
  if (!metaResponse.ok) {
    throw new Error(`Failed to fetch model metadata (${metaResponse.status} ${metaResponse.statusText})`);
  }
  const metadata: ModelMetadata = await metaResponse.json();

  if (!window.tmImage) {
    throw new Error('Teachable Machine Image library failed to initialize.');
  }

  const model = await window.tmImage.load(modelURL, metadataURL);
  return { model, metadata };
}

/**
 * Loads all three models in parallel:
 * 1. Model 3 (Imaging Type Classifier)
 * 2. Model 1 (Breast Ultrasound Classifier)
 * 3. Model 2 (Breast Mammogram Classifier)
 */
export async function loadAllModels(): Promise<{
  imagingType: LoadedModelBundle;
  ultrasound: LoadedModelBundle;
  mammogram: LoadedModelBundle;
}> {
  if (modelCache.imagingType && modelCache.ultrasound && modelCache.mammogram) {
    return {
      imagingType: modelCache.imagingType,
      ultrasound: modelCache.ultrasound,
      mammogram: modelCache.mammogram,
    };
  }

  if (loadingPromise) {
    await loadingPromise;
    return {
      imagingType: modelCache.imagingType!,
      ultrasound: modelCache.ultrasound!,
      mammogram: modelCache.mammogram!,
    };
  }

  loadingPromise = (async () => {
    try {
      await ensureLibrariesLoaded();

      const [typeBundle, usBundle, mammoBundle] = await Promise.all([
        loadSingleModel(MODEL_URLS.imagingType),
        loadSingleModel(MODEL_URLS.ultrasound),
        loadSingleModel(MODEL_URLS.mammogram),
      ]);

      modelCache.imagingType = typeBundle;
      modelCache.ultrasound = usBundle;
      modelCache.mammogram = mammoBundle;
    } catch (err: any) {
      modelCache.imagingType = null;
      modelCache.ultrasound = null;
      modelCache.mammogram = null;
      loadingPromise = null;
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to initialize models: ${msg}`);
    }
  })();

  await loadingPromise;
  return {
    imagingType: modelCache.imagingType!,
    ultrasound: modelCache.ultrasound!,
    mammogram: modelCache.mammogram!,
  };
}

/**
 * Exact canvas preprocessing matching Google Teachable Machine's preview handler.
 * Centers, square-crops, and draws the image onto a 224x224 canvas element.
 */
export function prepareTeachableMachineCanvas(
  image: HTMLImageElement,
  size = 224
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    return canvas;
  }

  // Exact function u implementation from Google Teachable Machine:
  const min = Math.min(width, height);
  const scale = size / min;
  const scaledW = Math.ceil(width * scale);
  const scaledH = Math.ceil(height * scale);
  const dx = scaledW - size;
  const dy = scaledH - size;

  ctx.drawImage(
    image,
    -1 * Math.floor(dx / 2),
    -1 * Math.floor(dy / 2),
    scaledW,
    scaledH
  );

  return canvas;
}

/**
 * Executes a prediction on an HTMLImageElement using the specified loaded model bundle
 */
async function runInference(bundle: LoadedModelBundle, imageElement: HTMLImageElement): Promise<RawPrediction[]> {
  const canvas = prepareTeachableMachineCanvas(imageElement, bundle.metadata.imageSize || 224);
  const rawPredictions = await bundle.model.predict(canvas);
  return rawPredictions.map((item: any, index: number) => ({
    className: String(item.className || bundle.metadata.labels[index] || `Class ${index + 1}`),
    probability: Number(item.probability ?? 0),
  }));
}

/**
 * Predicts the imaging type using Model 3
 */
export async function predictImagingType(imageElement: HTMLImageElement): Promise<RawPrediction[]> {
  const models = await loadAllModels();
  return runInference(models.imagingType, imageElement);
}

/**
 * Predicts cancer classification using Model 1 (Ultrasound BUSI)
 */
export async function predictUltrasound(imageElement: HTMLImageElement): Promise<RawPrediction[]> {
  const models = await loadAllModels();
  return runInference(models.ultrasound, imageElement);
}

/**
 * Predicts cancer classification using Model 2 (Mammogram AISSLab)
 */
export async function predictMammogram(imageElement: HTMLImageElement): Promise<RawPrediction[]> {
  const models = await loadAllModels();
  return runInference(models.mammogram, imageElement);
}

export type ModalityMode = 'auto' | 'mammogram' | 'ultrasound';

/**
 * Orchestrates classification:
 * - If modality is 'mammogram', routes directly to the Mammogram model (z8kfp45Hr).
 * - If modality is 'ultrasound', routes directly to the Ultrasound model (KkUeH33bv).
 * - If modality is 'auto', queries Model 3 (4J1sLOtpZ) to determine modality, then routes.
 */
export async function executePipeline(
  imageElement: HTMLImageElement,
  onStageChange?: (stage: 'identifying' | 'classifying') => void,
  modality: ModalityMode = 'auto'
): Promise<ClassificationResult> {
  let typeResult: ImagingTypeResult;
  let cancerPredictions: RawPrediction[];
  let modelName: string;
  let modelUrl: string;

  if (modality === 'mammogram') {
    onStageChange?.('classifying');
    cancerPredictions = await predictMammogram(imageElement);
    typeResult = {
      imagingType: 'Mammogram',
      confidence: 1.0,
      percentage: 100,
      formattedPercentage: 'Mammogram (Direct Selection)',
    };
    modelName = 'Breast Mammogram Classifier';
    modelUrl = MODEL_URLS.mammogram;
  } else if (modality === 'ultrasound') {
    onStageChange?.('classifying');
    cancerPredictions = await predictUltrasound(imageElement);
    typeResult = {
      imagingType: 'Ultrasound',
      confidence: 1.0,
      percentage: 100,
      formattedPercentage: 'Ultrasound (Direct Selection)',
    };
    modelName = 'Breast Ultrasound Classifier';
    modelUrl = MODEL_URLS.ultrasound;
  } else {
    // Step 1: Auto-identify imaging type via Model 3
    onStageChange?.('identifying');
    const typePredictions = await predictImagingType(imageElement);
    const autoType = determineImagingType(typePredictions);

    if (!autoType) {
      throw new Error(
        'Auto-detection was inconclusive. Please select "Mammogram" or "Ultrasound" above to classify directly with the designated model.'
      );
    }
    typeResult = autoType;

    // Step 2: Route to the designated model
    onStageChange?.('classifying');
    if (typeResult.imagingType === 'Ultrasound') {
      cancerPredictions = await predictUltrasound(imageElement);
      modelName = 'Breast Ultrasound Classifier';
      modelUrl = MODEL_URLS.ultrasound;
    } else {
      cancerPredictions = await predictMammogram(imageElement);
      modelName = 'Breast Mammogram Classifier';
      modelUrl = MODEL_URLS.mammogram;
    }
  }

  // Step 3: Build result with description and active model URL
  return buildClassificationResult(typeResult, cancerPredictions, modelName, modelUrl);
}

/**
 * Loads an image from a Data URL into an HTMLImageElement for canvas/tensor processing
 */
export function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if ('decode' in img) {
        try {
          await img.decode();
        } catch {
          // ignore decode errors on unsupported formats
        }
      }
      img.width = img.naturalWidth;
      img.height = img.naturalHeight;
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to load image for analysis.'));
    img.src = src;
  });
}
