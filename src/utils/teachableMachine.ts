import {
  RawPrediction,
  ClassificationResult,
  determineImagingType,
  buildClassificationResult,
} from './classification';

export const MODEL_URLS = {
  // Model 1: Breast Ultrasound Classifier (BUSI)
  ultrasound: 'https://teachablemachine.withgoogle.com/models/rB0NEZ0GJ/',
  // Model 2: Breast Mammogram Classifier (AISSLab)
  mammogram: 'https://teachablemachine.withgoogle.com/models/avy5UvxeG/',
  // Model 3: Imaging Type Classifier
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
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js', 'tfjs-cdn');
  }
  if (!window.tmImage) {
    await loadScript(
      'https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/teachablemachine-image.min.js',
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
 * Executes a prediction on an HTMLImageElement using the specified loaded model bundle
 */
async function runInference(bundle: LoadedModelBundle, imageElement: HTMLImageElement): Promise<RawPrediction[]> {
  const rawPredictions = await bundle.model.predict(imageElement);
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

/**
 * Orchestrates the full 3-model routing pipeline:
 * 1. Sends image to Model 3 to identify imaging type (Ultrasound or Mammogram).
 * 2. If unrecognized or ambiguous, throws an informative error without running cancer models.
 * 3. Routes image to Model 1 (if Ultrasound) or Model 2 (if Mammogram).
 * 4. Returns formatted classification result with imaging type, top class, scores, and short description.
 */
export async function executePipeline(
  imageElement: HTMLImageElement,
  onStageChange?: (stage: 'identifying' | 'classifying') => void
): Promise<ClassificationResult> {
  // Step 1 & 2: Identify imaging type via Model 3
  onStageChange?.('identifying');
  const typePredictions = await predictImagingType(imageElement);
  const typeResult = determineImagingType(typePredictions);

  if (!typeResult) {
    throw new Error(
      'Unable to confidently identify this image as a breast ultrasound or mammogram. Please upload a supported breast ultrasound or mammogram.'
    );
  }

  // Step 3: Route to the designated model
  onStageChange?.('classifying');
  let cancerPredictions: RawPrediction[];
  let modelName: string;

  if (typeResult.imagingType === 'Ultrasound') {
    cancerPredictions = await predictUltrasound(imageElement);
    modelName = 'Breast Ultrasound Classifier (BUSI)';
  } else if (typeResult.imagingType === 'Mammogram') {
    cancerPredictions = await predictMammogram(imageElement);
    modelName = 'Breast Mammogram Classifier (AISSLab)';
  } else {
    throw new Error('Unsupported imaging modality identified.');
  }

  // Step 4: Build result with description
  return buildClassificationResult(typeResult, cancerPredictions, modelName);
}

/**
 * Loads an image from a Data URL into an HTMLImageElement for canvas/tensor processing
 */
export function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for analysis.'));
    img.src = src;
  });
}
