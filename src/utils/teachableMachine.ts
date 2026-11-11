import {
  RawPrediction,
  UniversalCategory,
  UNIVERSAL_MODEL_SPEC,
  SPECIALIZED_MODELS,
  PipelineOutcome,
  DEFAULT_UNIVERSAL_MIN_CONFIDENCE,
  ImageNetPrediction,
  ObjectDetectionPrediction,
  checkImagePixelVariance,
  determineUniversalCategory,
  evaluateNonMedicalDomain,
  buildUnrelatedImageDetection,
  buildClassificationResult,
} from './classification';

export type ModelKey = 'universal' | UniversalCategory;

export const MODEL_URLS: Record<ModelKey, string> = {
  universal: UNIVERSAL_MODEL_SPEC.modelUrl,
  Brain_CT: SPECIALIZED_MODELS.Brain_CT.modelUrl,
  Brain_MRI: SPECIALIZED_MODELS.Brain_MRI.modelUrl,
  Knee_Xray: SPECIALIZED_MODELS.Knee_Xray.modelUrl,
  Skin_Photo: SPECIALIZED_MODELS.Skin_Photo.modelUrl,
  Breast_Mammogram: SPECIALIZED_MODELS.Breast_Mammogram.modelUrl,
  Breast_Ultrasound: SPECIALIZED_MODELS.Breast_Ultrasound.modelUrl,
  Lung_CT: SPECIALIZED_MODELS.Lung_CT.modelUrl,
};

export interface ModelMetadata {
  modelName?: string;
  labels: string[];
  imageSize?: number;
  tfjsVersion?: string;
}

export interface LoadedModelBundle {
  key: ModelKey;
  model: any;
  metadata: ModelMetadata;
}

export type PipelineStage =
  | 'idle'
  | 'identifying'
  | 'verifying_domain'
  | 'loading_specialized'
  | 'classifying';

export interface PipelineProgress {
  stage: PipelineStage;
  modelName?: string;
  category?: UniversalCategory;
}

declare global {
  interface Window {
    tf?: any;
    tmImage?: {
      load: (modelURL: string, metadataURL: string) => Promise<any>;
      [key: string]: any;
    };
    mobilenet?: {
      load: (config?: { version?: number; alpha?: number }) => Promise<{
        classify: (img: HTMLImageElement, topk?: number) => Promise<ImageNetPrediction[]>;
      }>;
    };
    cocoSsd?: {
      load: (config?: { base?: string }) => Promise<{
        detect: (
          img: HTMLImageElement,
          maxNumBoxes?: number,
          minScore?: number
        ) => Promise<Array<{ class: string; score: number }>>;
      }>;
    };
  }
}

const FETCH_TIMEOUT_MS = 25000;
const MOBILENET_CDN = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.0.4/dist/mobilenet.min.js';
const COCOSSD_CDN = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.0.3/dist/coco-ssd.min.js';

// In-memory cache and in-flight deduplication for lazy-loaded Teachable Machine models
const modelCache = new Map<ModelKey, LoadedModelBundle>();
const loadingPromises = new Map<ModelKey, Promise<LoadedModelBundle>>();

// Lazy-loaded cache for non-medical / unrelated image screening models
let cachedMobileNet: any | null = null;
let cachedCocoSsd: any | null = null;
let oodLoadPromise: Promise<{ mobileNet: any | null; cocoSsd: any | null }> | null = null;

/**
 * Checks whether a specific Teachable Machine model is already cached in memory
 */
export function isModelCached(key: ModelKey): boolean {
  return modelCache.has(key);
}

/**
 * Checks whether the non-medical domain guard models are cached in memory
 */
export function isDomainGuardCached(): boolean {
  return Boolean(cachedMobileNet || cachedCocoSsd);
}

/**
 * Returns the list of currently cached Teachable Machine model keys
 */
export function getCachedModelKeys(): ModelKey[] {
  return Array.from(modelCache.keys());
}

/**
 * Clears cached models (intended for error recovery or tests)
 */
export function clearModelCache(): void {
  for (const bundle of modelCache.values()) {
    try {
      if (typeof bundle.model?.dispose === 'function') {
        bundle.model.dispose();
      }
    } catch {
      // ignore disposal errors
    }
  }
  modelCache.clear();
  loadingPromises.clear();
}

function loadScriptOnce(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any).loaded) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load runtime library from ${src}`)), {
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
    script.onerror = () => reject(new Error(`Failed to load runtime library from ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Ensures TensorFlow.js and Teachable Machine Image libraries are loaded in window
 */
async function ensureLibrariesLoaded(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (window.tmImage && window.tf) {
    return;
  }

  if (!window.tf) {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js', 'tfjs-cdn');
  }
  if (!window.tmImage) {
    await loadScriptOnce(
      'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js',
      'tm-image-cdn'
    );
  }
}

/**
 * Lazily loads and caches client-side TensorFlow.js MobileNetV2 (ImageNet) and COCO-SSD
 * used to detect unrelated non-medical pictures (cars, pets, food, landscapes, etc.).
 * Fails gracefully if CDN assets are unavailable so primary medical models remain usable.
 */
async function ensureDomainGuardModels(): Promise<{ mobileNet: any | null; cocoSsd: any | null }> {
  if (typeof window === 'undefined') {
    return { mobileNet: null, cocoSsd: null };
  }

  if (cachedMobileNet && cachedCocoSsd) {
    return { mobileNet: cachedMobileNet, cocoSsd: cachedCocoSsd };
  }

  if (oodLoadPromise) {
    return oodLoadPromise;
  }

  oodLoadPromise = (async () => {
    try {
      await ensureLibrariesLoaded();
      await Promise.all([
        window.mobilenet ? Promise.resolve() : loadScriptOnce(MOBILENET_CDN, 'tfjs-mobilenet-cdn'),
        window.cocoSsd ? Promise.resolve() : loadScriptOnce(COCOSSD_CDN, 'tfjs-cocossd-cdn'),
      ]);

      const [mn, coco] = await Promise.all([
        cachedMobileNet
          ? Promise.resolve(cachedMobileNet)
          : window.mobilenet
          ? window.mobilenet.load({ version: 2, alpha: 1.0 })
          : Promise.resolve(null),
        cachedCocoSsd
          ? Promise.resolve(cachedCocoSsd)
          : window.cocoSsd
          ? window.cocoSsd.load({ base: 'lite_mobilenet_v2' })
          : Promise.resolve(null),
      ]);

      cachedMobileNet = mn;
      cachedCocoSsd = coco;
      return { mobileNet: cachedMobileNet, cocoSsd: cachedCocoSsd };
    } catch (err) {
      console.warn('Non-medical domain guard unavailable; falling back to Universal Classifier thresholds:', err);
      return { mobileNet: cachedMobileNet, cocoSsd: cachedCocoSsd };
    } finally {
      oodLoadPromise = null;
    }
  })();

  return oodLoadPromise;
}

/**
 * Fetches metadata with timeout and readable network error messages
 */
async function fetchMetadataWithTimeout(metadataURL: string, displayName: string): Promise<ModelMetadata> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(metadataURL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${displayName} metadata (HTTP ${response.status} ${response.statusText || 'Error'}).`
      );
    }
    const metadata: ModelMetadata = await response.json();
    if (!metadata || !Array.isArray(metadata.labels) || metadata.labels.length === 0) {
      throw new Error(`${displayName} metadata is missing class labels.`);
    }
    return metadata;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Timed out while loading ${displayName}. Please check your network connection and retry.`);
    }
    if (err instanceof TypeError) {
      throw new Error(
        `Network error while loading ${displayName}. Please verify your internet connection and try again.`
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Loads and caches a single Teachable Machine model by key (deduplicating concurrent calls)
 */
export async function loadModelByKey(key: ModelKey): Promise<LoadedModelBundle> {
  const cached = modelCache.get(key);
  if (cached) {
    return cached;
  }

  const inFlight = loadingPromises.get(key);
  if (inFlight) {
    return inFlight;
  }

  const baseURL = MODEL_URLS[key];
  const displayName =
    key === 'universal' ? UNIVERSAL_MODEL_SPEC.modelName : SPECIALIZED_MODELS[key].modelName;

  const promise = (async () => {
    try {
      await ensureLibrariesLoaded();

      const modelURL = `${baseURL}model.json`;
      const metadataURL = `${baseURL}metadata.json`;

      const metadata = await fetchMetadataWithTimeout(metadataURL, displayName);

      if (!window.tmImage || typeof window.tmImage.load !== 'function') {
        throw new Error('Teachable Machine Image runtime failed to initialize.');
      }

      const model = await window.tmImage.load(modelURL, metadataURL);
      const bundle: LoadedModelBundle = { key, model, metadata };
      modelCache.set(key, bundle);
      return bundle;
    } catch (err: unknown) {
      modelCache.delete(key);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes(displayName)) {
        throw new Error(msg);
      }
      throw new Error(`Failed to load ${displayName}: ${msg}`);
    } finally {
      loadingPromises.delete(key);
    }
  })();

  loadingPromises.set(key, promise);
  return promise;
}

/**
 * Loads ONLY the Universal Medical Imaging Classifier on app startup.
 * Specialized models and domain-guard models are intentionally lazy-loaded on demand.
 */
export async function loadUniversalModel(): Promise<LoadedModelBundle> {
  return loadModelByKey('universal');
}

/**
 * Loads a single specialized model on demand (or returns it from cache).
 */
export async function loadSpecializedModel(category: UniversalCategory): Promise<LoadedModelBundle> {
  return loadModelByKey(category);
}

/**
 * Runs inference using the unmodified original uploaded HTMLImageElement.
 * Passing the full-resolution HTMLImageElement (with width === naturalWidth and height === naturalHeight)
 * lets Teachable Machine's own cropTo/predict pipeline handle preprocessing uniformly for both
 * Stage 1 and Stage 2 without double-cropping, stretching, or distortion, while tmImage disposes logits internally.
 */
async function runInference(
  bundle: LoadedModelBundle,
  imageElement: HTMLImageElement
): Promise<RawPrediction[]> {
  if (!imageElement || !imageElement.naturalWidth || !imageElement.naturalHeight) {
    throw new Error('Uploaded image has invalid dimensions and cannot be analyzed.');
  }

  imageElement.width = imageElement.naturalWidth;
  imageElement.height = imageElement.naturalHeight;

  const rawPredictions = await bundle.model.predict(imageElement, false);
  if (!Array.isArray(rawPredictions) || rawPredictions.length === 0) {
    throw new Error(`No predictions were returned by ${bundle.key} model.`);
  }

  return rawPredictions.map((item: any, index: number) => ({
    className: String(item?.className ?? bundle.metadata.labels[index] ?? `Class ${index + 1}`),
    probability: Number(item?.probability ?? 0),
  }));
}

/**
 * Predicts the imaging category using the Universal Medical Imaging Classifier (9v7G7hmAY).
 */
export async function predictUniversalCategory(imageElement: HTMLImageElement): Promise<RawPrediction[]> {
  const universalBundle = await loadUniversalModel();
  return runInference(universalBundle, imageElement);
}

/**
 * Predicts condition classification using ONLY the designated specialized model.
 */
export async function predictSpecializedCondition(
  category: UniversalCategory,
  imageElement: HTMLImageElement
): Promise<RawPrediction[]> {
  const specializedBundle = await loadSpecializedModel(category);
  return runInference(specializedBundle, imageElement);
}

/**
 * Validates that the image contains actual visual variation (not blank/all-black/solid color)
 * using a lightweight 64x64 offscreen sample without altering the original HTMLImageElement.
 */
function hasReadableVisualContent(imageElement: HTMLImageElement): { valid: boolean; reason?: string } {
  if (typeof document === 'undefined') return { valid: true };
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 64;
  sampleCanvas.height = 64;
  const ctx = sampleCanvas.getContext('2d');
  if (!ctx) return { valid: true };

  ctx.drawImage(imageElement, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);
  const check = checkImagePixelVariance(data, 4);
  return { valid: check.valid, reason: check.reason };
}

/**
 * Screens the image with client-side ImageNet & COCO-SSD models to detect unrelated
 * non-medical subjects (cars, animals, food, landscapes, etc.).
 */
async function runNonMedicalDomainCheck(imageElement: HTMLImageElement) {
  const { mobileNet, cocoSsd } = await ensureDomainGuardModels();
  if (!mobileNet && !cocoSsd) {
    return { isUnrelated: false as const };
  }

  let imageNetPredictions: ImageNetPrediction[] = [];
  let objectDetections: ObjectDetectionPrediction[] = [];

  try {
    const [mnRes, cocoRes] = await Promise.all([
      mobileNet ? mobileNet.classify(imageElement, 3) : Promise.resolve([]),
      cocoSsd ? cocoSsd.detect(imageElement, 5, 0.4) : Promise.resolve([]),
    ]);

    imageNetPredictions = Array.isArray(mnRes)
      ? mnRes.map((p: any) => ({
          className: String(p.className ?? ''),
          probability: Number(p.probability ?? 0),
        }))
      : [];

    objectDetections = Array.isArray(cocoRes)
      ? cocoRes.map((d: any) => ({
          className: String(d.class ?? ''),
          score: Number(d.score ?? 0),
        }))
      : [];
  } catch (err) {
    console.warn('Domain verification inference warning:', err);
    return { isUnrelated: false as const };
  }

  return evaluateNonMedicalDomain({
    imageNetPredictions,
    objectDetections,
  });
}

/**
 * Executes the two-stage classification pipeline with unrelated-image protection:
 * 1. Checks pixel content for blank/uniform images.
 * 2. Always runs Stage 1 Universal Medical Imaging Classifier (9v7G7hmAY) first.
 * 3. Runs client-side Non-Medical Image Support Check to catch unrelated everyday pictures
 *    (cars, pets, food, landscapes, laptops, etc.) before routing to any disease model.
 * 4. Applies Stage 1 confidence & tie thresholds; stops if uncertain.
 * 5. Lazy-loads (or reuses cached) ONLY the single matching specialized model and runs inference
 *    on the unmodified original uploaded image.
 */
export async function executePipeline(
  imageElement: HTMLImageElement,
  onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineOutcome> {
  onProgress?.({
    stage: 'identifying',
    modelName: UNIVERSAL_MODEL_SPEC.modelName,
  });

  const contentCheck = hasReadableVisualContent(imageElement);
  if (!contentCheck.valid) {
    return {
      status: 'uncertain',
      universal: {
        confident: false,
        reason: 'blank_or_uniform_image',
        topCandidate: null,
        secondCandidate: null,
        minConfidenceRequired: DEFAULT_UNIVERSAL_MIN_CONFIDENCE,
        allScores: [],
        explanation:
          contentCheck.reason ||
          'The uploaded image appears blank or uniform in color. No specialized model was run.',
      },
    };
  }

  // Stage 1: Universal Medical Imaging Classifier (always runs first)
  const universalPredictions = await predictUniversalCategory(imageElement);

  // Domain Guard: Screen for unrelated everyday subjects before loading/running any Stage 2 disease model
  onProgress?.({
    stage: 'verifying_domain',
  });
  const domainEval = await runNonMedicalDomainCheck(imageElement);
  if (domainEval.isUnrelated) {
    return {
      status: 'unrelated',
      unrelated: buildUnrelatedImageDetection(domainEval, universalPredictions),
    };
  }

  const routingDecision = determineUniversalCategory(universalPredictions);

  // Confidence gate: do NOT run any specialized model if category confidence is low/ambiguous
  if (!routingDecision.confident) {
    return {
      status: 'uncertain',
      universal: routingDecision,
    };
  }

  const targetCategory = routingDecision.category;
  const spec = routingDecision.specializedModel;

  // Stage 2: Load ONLY the corresponding specialized model (cached if already loaded)
  if (!isModelCached(targetCategory)) {
    onProgress?.({
      stage: 'loading_specialized',
      modelName: spec.modelName,
      category: targetCategory,
    });
  }

  const specializedBundle = await loadSpecializedModel(targetCategory);

  onProgress?.({
    stage: 'classifying',
    modelName: spec.modelName,
    category: targetCategory,
  });

  const specializedPredictions = await runInference(specializedBundle, imageElement);
  const result = buildClassificationResult(routingDecision, specializedPredictions);

  return {
    status: 'classified',
    result,
  };
}

/**
 * Loads an image from a Data URL into a detached HTMLImageElement at full natural dimensions
 * for unmodified tensor/canvas preprocessing.
 */
export function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src || typeof src !== 'string') {
      reject(new Error('Invalid image source. Please upload a PNG, JPG, or JPEG image.'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if ('decode' in img) {
        try {
          await img.decode();
        } catch {
          // ignore decode error on valid loaded images; dimensions checked below
        }
      }
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error('The uploaded file is not a valid readable image.'));
        return;
      }
      img.width = img.naturalWidth;
      img.height = img.naturalHeight;
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to decode the uploaded image. Please choose a valid PNG or JPG file.'));
    img.src = src;
  });
}
