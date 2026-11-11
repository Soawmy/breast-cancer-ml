export type UniversalCategory =
  | 'Brain_CT'
  | 'Brain_MRI'
  | 'Knee_Xray'
  | 'Breast_Mammogram'
  | 'Breast_Ultrasound'
  | 'Lung_CT'
  | 'Skin_Photo';

export interface RawPrediction {
  className: string;
  probability: number;
}

export interface ClassScore {
  className: string;
  displayName: string;
  probability: number;
  percentage: number;
  formattedPercentage: string;
}

export interface SpecializedModelSpec {
  category: UniversalCategory;
  categoryDisplayName: string;
  modelName: string;
  modelUrl: string;
  classes: readonly string[];
}

export const UNIVERSAL_MODEL_SPEC = {
  modelName: 'Universal Medical Imaging Classifier',
  modelUrl: 'https://teachablemachine.withgoogle.com/models/9v7G7hmAY/',
  classes: [
    'Brain_CT',
    'Brain_MRI',
    'Knee_Xray',
    'Breast_Mammogram',
    'Breast_Ultrasound',
    'Lung_CT',
    'Skin_Photo',
  ] as const,
} as const;

export const SPECIALIZED_MODELS: Record<UniversalCategory, SpecializedModelSpec> = {
  Brain_CT: {
    category: 'Brain_CT',
    categoryDisplayName: 'Brain CT',
    modelName: 'Brain CT Classifier',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/mlMAgmz2b/',
    classes: ['Aneurysm', 'Cancer', 'Tumor'],
  },
  Brain_MRI: {
    category: 'Brain_MRI',
    categoryDisplayName: 'Brain MRI',
    modelName: 'Brain Cancer MRI Classifier',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/DzBtWne84/',
    classes: ['Glioma', 'Meningioma', 'Pituitary_Tumor'],
  },
  Knee_Xray: {
    category: 'Knee_Xray',
    categoryDisplayName: 'Knee X-ray',
    modelName: 'Knee X-ray Osteoporosis Classifier',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/oEwbUYRWS/',
    classes: ['Normal', 'Osteopenia', 'Osteoporosis'],
  },
  Skin_Photo: {
    category: 'Skin_Photo',
    categoryDisplayName: 'Skin Photo',
    modelName: 'Skin Condition Classifier',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/SCeO8fwh6/',
    classes: ['Acne', 'Hyperpigmentation', 'Nail_Psoriasis', 'SJS_TEN', 'Vitiligo'],
  },
  Breast_Mammogram: {
    category: 'Breast_Mammogram',
    categoryDisplayName: 'Breast Mammogram',
    modelName: 'Breast Mammogram Classifier',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/z8kfp45Hr/',
    classes: ['benign', 'malignant', 'normal'],
  },
  Breast_Ultrasound: {
    category: 'Breast_Ultrasound',
    categoryDisplayName: 'Breast Ultrasound',
    modelName: 'Breast Ultrasound Classifier',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/KkUeH33bv/',
    classes: ['benign', 'malignant', 'normal'],
  },
  Lung_CT: {
    category: 'Lung_CT',
    categoryDisplayName: 'Lung CT',
    modelName: 'Lung Cancer Classifier',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/bIu7wqmgS/',
    classes: ['Normal', 'Benign', 'Malignant'],
  },
};

export const SPECIALIZED_MODEL_LIST: SpecializedModelSpec[] = [
  SPECIALIZED_MODELS.Brain_CT,
  SPECIALIZED_MODELS.Brain_MRI,
  SPECIALIZED_MODELS.Knee_Xray,
  SPECIALIZED_MODELS.Breast_Mammogram,
  SPECIALIZED_MODELS.Breast_Ultrasound,
  SPECIALIZED_MODELS.Lung_CT,
  SPECIALIZED_MODELS.Skin_Photo,
];

export const DEFAULT_UNIVERSAL_MIN_CONFIDENCE = 0.55;
export const DEFAULT_UNIVERSAL_TIE_MARGIN = 0.15;
export const DEFAULT_UNIVERSAL_DECISIVE_CONFIDENCE = 0.7;

export const SPECIALIZED_LOW_CONFIDENCE_THRESHOLD = 0.6;
export const SPECIALIZED_BORDERLINE_MARGIN = 0.15;

export const CLOSED_SET_SCOPE_NOTE =
  'Closed-set model notice: The universal classifier maps every image to whichever of the 7 supported medical modalities is closest and does not include a "Non-Medical" rejection class. Unrelated everyday photos outside these 7 categories are unsupported.';

export interface PixelContentCheckResult {
  valid: boolean;
  stdDev: number;
  range: number;
  reason?: string;
}

/**
 * Checks sampled RGBA (or RGB) pixel values to detect completely blank, all-black,
 * all-white, or uniform solid-color images before classification.
 */
export function checkImagePixelVariance(rgbaPixels: ArrayLike<number>, channels = 4): PixelContentCheckResult {
  if (!rgbaPixels || rgbaPixels.length < channels) {
    return {
      valid: false,
      stdDev: 0,
      range: 0,
      reason: 'The image contains no readable pixel data.',
    };
  }

  const count = Math.floor(rgbaPixels.length / channels);
  let sum = 0;
  let sumSq = 0;
  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < count; i++) {
    const idx = i * channels;
    const r = rgbaPixels[idx] ?? 0;
    const g = rgbaPixels[idx + 1] ?? r;
    const b = rgbaPixels[idx + 2] ?? r;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += lum;
    sumSq += lum * lum;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  const stdDev = Math.sqrt(variance);
  const range = maxLum - minLum;

  if (stdDev < 2.5 || range < 8) {
    return {
      valid: false,
      stdDev,
      range,
      reason:
        'The uploaded image appears blank or uniform in color and does not contain recognizable medical scan or skin detail.',
    };
  }

  return { valid: true, stdDev, range };
}

export interface UniversalCategoryMatch {
  confident: true;
  category: UniversalCategory;
  categoryDisplayName: string;
  confidence: number;
  percentage: number;
  formattedPercentage: string;
  allScores: ClassScore[];
  specializedModel: SpecializedModelSpec;
}

export interface UniversalCategoryUncertain {
  confident: false;
  reason: 'low_confidence' | 'ambiguous_tie' | 'unrecognized_class' | 'empty_predictions' | 'blank_or_uniform_image';
  topCandidate: ClassScore | null;
  secondCandidate: ClassScore | null;
  minConfidenceRequired: number;
  allScores: ClassScore[];
  explanation: string;
}

export type UniversalRoutingDecision = UniversalCategoryMatch | UniversalCategoryUncertain;

export interface ClassificationResult {
  universal: UniversalCategoryMatch;
  modelName: string;
  modelUrl: string;
  topClass: ClassScore;
  allScores: ClassScore[];
  isLowConfidence: boolean;
  confidenceNote: string | null;
  pipelineSummary: string;
  description: string;
}

export interface UnrelatedImageDetection {
  isUnrelated: true;
  detectedSubject: string;
  subjectCategory: string;
  confidence: number;
  formattedConfidence: string;
  detectorSource: 'ImageNet' | 'ObjectDetector';
  universalTopCandidate: ClassScore | null;
  allUniversalScores: ClassScore[];
  explanation: string;
}

export type PipelineOutcome =
  | {
      status: 'classified';
      result: ClassificationResult;
    }
  | {
      status: 'uncertain';
      universal: UniversalCategoryUncertain;
    }
  | {
      status: 'unrelated';
      unrelated: UnrelatedImageDetection;
    };

const CATEGORY_NORMALIZATION_MAP: Record<string, UniversalCategory> = {
  brain_ct: 'Brain_CT',
  brain_mri: 'Brain_MRI',
  knee_xray: 'Knee_Xray',
  breast_mammogram: 'Breast_Mammogram',
  breast_ultrasound: 'Breast_Ultrasound',
  lung_ct: 'Lung_CT',
  skin_photo: 'Skin_Photo',
};

const CATEGORY_DISPLAY_NAMES: Record<UniversalCategory, string> = {
  Brain_CT: 'Brain CT',
  Brain_MRI: 'Brain MRI',
  Knee_Xray: 'Knee X-ray',
  Breast_Mammogram: 'Breast Mammogram',
  Breast_Ultrasound: 'Breast Ultrasound',
  Lung_CT: 'Lung CT',
  Skin_Photo: 'Skin Photo',
};

/**
 * Normalizes a raw Universal Classifier label into one of the seven UniversalCategory keys.
 */
export function normalizeUniversalCategory(rawClassName: string): UniversalCategory | null {
  if (!rawClassName) return null;
  const normalized = rawClassName.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return CATEGORY_NORMALIZATION_MAP[normalized] ?? null;
}

/**
 * Formats a raw model label for readable UI presentation while preserving exact acronyms like SJS_TEN.
 */
export function formatLabel(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const category = normalizeUniversalCategory(trimmed);
  if (category) {
    return CATEGORY_DISPLAY_NAMES[category];
  }

  if (trimmed === 'SJS_TEN') {
    return 'SJS_TEN';
  }

  const withSpaces = trimmed.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Returns a strictly factual, non-diagnostic educational description for a specialized model class.
 */
export function getClassDescription(rawClassName: string, category?: UniversalCategory): string {
  if (!rawClassName) return '';
  const norm = rawClassName.trim().toLowerCase();

  // Lung CT shares Normal / Benign / Malignant names with Breast models — distinguish accurately
  if (category === 'Lung_CT') {
    if (norm === 'normal') {
      return 'In the Lung Cancer Classifier, "Normal" indicates that the model did not detect abnormal pulmonary mass or nodule patterns in the uploaded lung CT image. This output does not rule out lung disease; complete assessment requires evaluation by a qualified radiologist.';
    }
    if (norm === 'benign') {
      return 'In the Lung Cancer Classifier, "Benign" refers to lung CT patterns associated with non-cancerous pulmonary findings. Clinical correlation and radiologist review are needed to confirm whether a finding is benign.';
    }
    if (norm === 'malignant') {
      return 'In the Lung Cancer Classifier, "Malignant" refers to lung CT patterns associated with cancerous lung tissue. Further diagnostic imaging, specialist consultation, and tissue sampling when indicated are required to establish a diagnosis.';
    }
  }

  // Breast Mammogram & Breast Ultrasound classes (and default fallback)
  if (
    !category ||
    category === 'Breast_Mammogram' ||
    category === 'Breast_Ultrasound'
  ) {
    if (norm === 'benign') {
      return 'A benign breast finding is a non-cancerous abnormality in breast tissue. Common examples include breast cysts and fibroadenomas. Although benign findings are not cancer, some may still require monitoring or medical evaluation.';
    }
    if (norm === 'malignant') {
      return 'A malignant breast finding refers to an abnormality associated with cancerous growth. Malignant tumors can invade surrounding tissue and may spread to other parts of the body. Further medical evaluation and, when indicated, a biopsy are needed to establish a diagnosis.';
    }
    if (norm === 'normal') {
      return 'A normal classification means the model did not identify an abnormality in the uploaded image. However, this does not guarantee that the breast is free of disease or rule out cancer. A complete medical assessment requires appropriate imaging interpretation by a qualified radiologist.';
    }
  }

  // Brain CT classes
  if (norm === 'aneurysm') {
    return 'In the Brain CT Classifier, "Aneurysm" refers to imaging patterns associated with a localized bulge or dilation in a cerebral blood vessel. Automated classification is not a medical diagnosis and requires urgent review by a qualified radiologist or clinician when clinically suspected.';
  }
  if (norm === 'cancer') {
    return 'In the Brain CT Classifier, "Cancer" refers to CT patterns associated with malignant intracranial lesions. Clinical correlation, diagnostic imaging review, and specialist evaluation are necessary to establish a diagnosis.';
  }
  if (norm === 'tumor') {
    return 'In the Brain CT Classifier, "Tumor" refers to CT patterns consistent with an abnormal intracranial mass or growth. Further specialist imaging and clinical evaluation are required to characterize any suspected lesion.';
  }

  // Brain MRI classes
  if (norm === 'glioma') {
    return 'In the Brain Cancer MRI Classifier, "Glioma" refers to MRI patterns associated with tumors originating from glial cells in the brain or spinal cord. This automated prediction is for educational use only and requires formal review by a qualified radiologist or neuro-oncologist.';
  }
  if (norm === 'meningioma') {
    return 'In the Brain Cancer MRI Classifier, "Meningioma" refers to MRI patterns associated with tumors arising from the meninges surrounding the brain and spinal cord. Clinical interpretation by a qualified specialist is required.';
  }
  if (norm === 'pituitary_tumor' || norm === 'pituitary tumor') {
    return 'In the Brain Cancer MRI Classifier, "Pituitary_Tumor" refers to MRI patterns associated with an abnormal growth in the pituitary gland region. Further clinical assessment and specialist radiology review are required for diagnosis.';
  }

  // Knee X-ray classes
  if (category === 'Knee_Xray' && norm === 'normal') {
    return 'In the Knee X-ray Osteoporosis Classifier, "Normal" indicates that the model did not identify radiographic patterns associated with reduced bone density (osteopenia or osteoporosis). Formal bone mineral density assessment such as a DEXA scan and physician review are needed for clinical evaluation.';
  }
  if (norm === 'osteopenia') {
    return 'In the Knee X-ray Osteoporosis Classifier, "Osteopenia" refers to radiographic patterns associated with lower-than-normal bone mineral density below the diagnostic threshold for osteoporosis. Formal bone densitometry and clinician review are required.';
  }
  if (norm === 'osteoporosis') {
    return 'In the Knee X-ray Osteoporosis Classifier, "Osteoporosis" refers to radiographic patterns associated with decreased bone density and bone thinning. Confirming osteoporosis requires clinical bone density testing and evaluation by a healthcare provider.';
  }

  // Skin Photo classes
  if (norm === 'acne') {
    return 'In the Skin Condition Classifier, "Acne" refers to photographic patterns associated with inflammatory or comedonal hair-follicle lesions. Evaluation by a clinician or dermatologist is recommended for accurate diagnosis and treatment.';
  }
  if (norm === 'hyperpigmentation') {
    return 'In the Skin Condition Classifier, "Hyperpigmentation" refers to photographic patterns where areas of skin appear darker due to increased melanin. A dermatologist or healthcare provider can evaluate the underlying cause.';
  }
  if (norm === 'nail_psoriasis' || norm === 'nail psoriasis') {
    return 'In the Skin Condition Classifier, "Nail_Psoriasis" refers to photographic patterns involving nail changes associated with psoriasis. Clinical examination is required to distinguish nail psoriasis from fungal or other nail conditions.';
  }
  if (norm === 'sjs_ten') {
    return 'In the Skin Condition Classifier, "SJS_TEN" refers to photographic patterns associated with Stevens-Johnson syndrome / toxic epidermal necrolysis, a severe mucocutaneous reaction. Immediate medical evaluation by a physician is essential whenever severe skin reactions are suspected.';
  }
  if (norm === 'vitiligo') {
    return 'In the Skin Condition Classifier, "Vitiligo" refers to photographic patterns involving localized loss of skin pigment creating depigmented patches. A dermatologist can confirm the diagnosis and discuss appropriate options.';
  }

  // BI-RADS classes if returned by a model
  if (norm === 'bi-rads 2' || norm === 'birads 2' || norm === 'bi-rads2') {
    return 'Benign finding.';
  }
  if (norm === 'bi-rads 3' || norm === 'birads 3' || norm === 'bi-rads3') {
    return 'Probably benign finding.';
  }
  if (norm === 'bi-rads 4' || norm === 'birads 4' || norm === 'bi-rads4') {
    return 'Suspicious finding.';
  }
  if (norm === 'bi-rads 5' || norm === 'birads 5' || norm === 'bi-rads5') {
    return 'Highly suggestive of malignancy.';
  }

  return '';
}

/**
 * Validates file format and size for image upload.
 * Accepts PNG, JPG, and JPEG up to 30MB and rejects empty or invalid files.
 */
export function validateUploadImage(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Please select an image file.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes). Please choose a valid image.' };
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const hasValidExt = /\.(jpe?g|png)$/i.test(file.name || '');
  const normalizedType = (file.type || '').trim().toLowerCase();

  if (normalizedType) {
    if (!allowedTypes.includes(normalizedType)) {
      return {
        valid: false,
        error: 'Invalid file format. Please upload a PNG, JPG, or JPEG image.',
      };
    }
  } else if (!hasValidExt) {
    return {
      valid: false,
      error: 'Unsupported file extension. Please upload a PNG, JPG, or JPEG image.',
    };
  }

  const maxBytes = 30 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: 'The image file exceeds the 30MB maximum limit.',
    };
  }

  return { valid: true };
}

/**
 * Processes raw model predictions:
 * - Sanitizes/clamps probabilities to [0, 1]
 * - Formats percentage strings
 * - Sorts descending by probability
 */
export function processScores(predictions: RawPrediction[]): { topClass: ClassScore; allScores: ClassScore[] } {
  if (!predictions || predictions.length === 0) {
    throw new Error('No predictions returned by model.');
  }

  const scores: ClassScore[] = predictions.map((item) => {
    const rawProb = Number(item.probability);
    const probability = Number.isFinite(rawProb) ? Math.max(0, Math.min(1, rawProb)) : 0;
    const percentage = Number((probability * 100).toFixed(1));
    const trimmedClassName = String(item.className ?? '').trim();
    return {
      className: trimmedClassName,
      displayName: formatLabel(trimmedClassName),
      probability,
      percentage,
      formattedPercentage: `${percentage.toFixed(1)}%`,
    };
  });

  const sorted = [...scores].sort((a, b) => b.probability - a.probability);

  return {
    topClass: sorted[0],
    allScores: sorted,
  };
}

/**
 * Evaluates Stage 1 (Universal Medical Imaging Classifier) output and decides
 * whether routing to a specialized model is sufficiently confident.
 */
export function determineUniversalCategory(
  universalPredictions: RawPrediction[],
  minConfidence = DEFAULT_UNIVERSAL_MIN_CONFIDENCE,
  tieMargin = DEFAULT_UNIVERSAL_TIE_MARGIN,
  decisiveConfidence = DEFAULT_UNIVERSAL_DECISIVE_CONFIDENCE
): UniversalRoutingDecision {
  if (!universalPredictions || universalPredictions.length === 0) {
    return {
      confident: false,
      reason: 'empty_predictions',
      topCandidate: null,
      secondCandidate: null,
      minConfidenceRequired: minConfidence,
      allScores: [],
      explanation:
        'The Universal Medical Imaging Classifier did not return any category probabilities for this image. Please try uploading a clearer medical scan.',
    };
  }

  const { topClass, allScores } = processScores(universalPredictions);
  const secondClass = allScores.length > 1 ? allScores[1] : null;

  const matchedCategory = normalizeUniversalCategory(topClass.className);
  if (!matchedCategory) {
    return {
      confident: false,
      reason: 'unrecognized_class',
      topCandidate: topClass,
      secondCandidate: secondClass,
      minConfidenceRequired: minConfidence,
      allScores,
      explanation: `The universal classifier returned an unrecognized category label ("${topClass.className}"). No specialized model was run.`,
    };
  }

  if (topClass.probability < minConfidence) {
    const requiredPct = (minConfidence * 100).toFixed(0);
    return {
      confident: false,
      reason: 'low_confidence',
      topCandidate: topClass,
      secondCandidate: secondClass,
      minConfidenceRequired: minConfidence,
      allScores,
      explanation: `The universal classifier's highest score (${topClass.className} at ${topClass.formattedPercentage}) is below the ${requiredPct}% confidence threshold required for routing. Because the imaging modality could not be reliably identified, no specialized disease model was run.`,
    };
  }

  if (
    secondClass &&
    topClass.probability < decisiveConfidence &&
    topClass.probability - secondClass.probability < tieMargin
  ) {
    return {
      confident: false,
      reason: 'ambiguous_tie',
      topCandidate: topClass,
      secondCandidate: secondClass,
      minConfidenceRequired: minConfidence,
      allScores,
      explanation: `The universal classifier produced competing probabilities between ${topClass.className} (${topClass.formattedPercentage}) and ${secondClass.className} (${secondClass.formattedPercentage}). Because the category is ambiguous, no specialized disease model was run.`,
    };
  }

  const specializedModel = SPECIALIZED_MODELS[matchedCategory];

  return {
    confident: true,
    category: matchedCategory,
    categoryDisplayName: specializedModel.categoryDisplayName,
    confidence: topClass.probability,
    percentage: topClass.percentage,
    formattedPercentage: topClass.formattedPercentage,
    allScores,
    specializedModel,
  };
}

/**
 * Builds the complete two-stage ClassificationResult object from real Stage 1 and Stage 2 outputs.
 */
export function buildClassificationResult(
  universalMatch: UniversalCategoryMatch,
  specializedPredictions: RawPrediction[]
): ClassificationResult {
  const { topClass, allScores } = processScores(specializedPredictions);
  const secondClass = allScores.length > 1 ? allScores[1] : null;
  const spec = universalMatch.specializedModel;

  const isBelowThreshold = topClass.probability < SPECIALIZED_LOW_CONFIDENCE_THRESHOLD;
  const isCloseSplit =
    Boolean(secondClass) &&
    topClass.probability < 0.75 &&
    topClass.probability - (secondClass?.probability ?? 0) < SPECIALIZED_BORDERLINE_MARGIN;

  const isLowConfidence = isBelowThreshold || isCloseSplit;

  let confidenceNote: string | null = null;
  if (isBelowThreshold) {
    confidenceNote = `Low confidence output: ${spec.modelName} assigned ${topClass.formattedPercentage} to "${topClass.className}". Treat this result as uncertain and never as a confirmed medical diagnosis.`;
  } else if (isCloseSplit && secondClass) {
    confidenceNote = `Closely split probabilities: "${topClass.className}" (${topClass.formattedPercentage}) and "${secondClass.className}" (${secondClass.formattedPercentage}) have overlapping model scores. Treat this result as inconclusive.`;
  }

  const scorePreview = allScores
    .slice(0, 3)
    .map((s) => `${s.className} (${s.formattedPercentage})`)
    .join(', ');

  const pipelineSummary =
    `Stage 1 (${UNIVERSAL_MODEL_SPEC.modelName}) identified the image as ${universalMatch.category} ` +
    `(${universalMatch.formattedPercentage}) and routed the original image to ${spec.modelName}. ` +
    `Stage 2 evaluated ${allScores.length} classes [${scorePreview}${allScores.length > 3 ? ', ...' : ''}], ` +
    `assigning the highest probability to ${topClass.className} (${topClass.formattedPercentage}).`;

  const description = getClassDescription(topClass.className, universalMatch.category);

  return {
    universal: universalMatch,
    modelName: spec.modelName,
    modelUrl: spec.modelUrl,
    topClass,
    allScores,
    isLowConfidence,
    confidenceNote,
    pipelineSummary,
    description,
  };
}

export interface ImageNetPrediction {
  className: string;
  probability: number;
}

export interface ObjectDetectionPrediction {
  className: string;
  score: number;
}

export interface NonMedicalDomainInput {
  imageNetPredictions?: ImageNetPrediction[];
  objectDetections?: ObjectDetectionPrediction[];
}

export type NonMedicalEvaluation =
  | { isUnrelated: false }
  | {
      isUnrelated: true;
      detectedSubject: string;
      subjectCategory: string;
      confidence: number;
      formattedConfidence: string;
      detectorSource: 'ImageNet' | 'ObjectDetector';
    };

interface NonMedicalRuleGroup {
  category: string;
  keywords: readonly string[];
}

// High-precision ImageNet non-medical subject keywords.
// Deliberately excludes terms ImageNet assigns to medical scans or dermatology close-ups
// (e.g. monitor, screen, television, Band Aid, sunscreen, mask, sandal, clog, bubble, Petri dish, gown, shield, buckle, head cabbage, tray).
const NON_MEDICAL_IMAGENET_GROUPS: readonly NonMedicalRuleGroup[] = [
  {
    category: 'Vehicle / Transportation',
    keywords: [
      'sports car',
      'sport car',
      'convertible',
      'limousine',
      'minivan',
      'cab',
      'taxi',
      'jeep',
      'pickup',
      'racer',
      'race car',
      'racing car',
      'police van',
      'ambulance',
      'moving van',
      'tow truck',
      'trailer truck',
      'fire engine',
      'garbage truck',
      'school bus',
      'trolleybus',
      'minibus',
      'recreational vehicle',
      'snowmobile',
      'go-kart',
      'golfcart',
      'moped',
      'motor scooter',
      'mountain bike',
      'bicycle',
      'tandem bicycle',
      'unicycle',
      'tricycle',
      'grille',
      'radiator grille',
      'car wheel',
      'airliner',
      'warplane',
      'space shuttle',
      'airship',
      'balloon',
      'locomotive',
      'bullet train',
      'passenger car',
      'streetcar',
      'speedboat',
      'sailboat',
      'catamaran',
      'trimaran',
      'canoe',
      'gondola',
      'lifeboat',
      'liner',
      'aircraft carrier',
      'submarine',
      'container ship',
      'tractor',
      'forklift',
      'crane',
    ],
  },
  {
    category: 'Animal / Wildlife',
    keywords: [
      'tabby',
      'tiger cat',
      'persian cat',
      'siamese cat',
      'egyptian cat',
      'cougar',
      'lynx',
      'leopard',
      'snow leopard',
      'jaguar',
      'lion',
      'tiger',
      'cheetah',
      'retriever',
      'terrier',
      'spaniel',
      'poodle',
      'husky',
      'malamute',
      'pug',
      'chihuahua',
      'beagle',
      'bulldog',
      'shepherd',
      'collie',
      'corgi',
      'dachshund',
      'dalmatian',
      'rottweiler',
      'doberman',
      'boxer',
      'great dane',
      'pomeranian',
      'samoyed',
      'chow',
      'wolf',
      'fox',
      'coyote',
      'hyena',
      'brown bear',
      'black bear',
      'polar bear',
      'giant panda',
      'elephant',
      'zebra',
      'giraffe',
      'hippopotamus',
      'rhinoceros',
      'bison',
      'ox',
      'ram',
      'gazelle',
      'impala',
      'camel',
      'llama',
      'horse',
      'sorrel',
      'orangutan',
      'gorilla',
      'chimpanzee',
      'baboon',
      'macaque',
      'squirrel',
      'rabbit',
      'hare',
      'hamster',
      'guinea pig',
      'kangaroo',
      'koala',
      'eagle',
      'owl',
      'parrot',
      'macaw',
      'penguin',
      'flamingo',
      'pelican',
      'swan',
      'duck',
      'goose',
      'peacock',
      'rooster',
      'hen',
      'ostrich',
      'shark',
      'whale',
      'killer whale',
      'sea lion',
      'turtle',
      'tortoise',
      'iguana',
      'chameleon',
      'cobra',
      'python',
      'butterfly',
      'monarch',
      'dragonfly',
      'beetle',
      'lobster',
    ],
  },
  {
    category: 'Food / Beverage / Tableware',
    keywords: [
      'pizza',
      'cheeseburger',
      'hotdog',
      'burrito',
      'taco',
      'french loaf',
      'bagel',
      'pretzel',
      'croissant',
      'ice cream',
      'ice lolly',
      'trifle',
      'espresso',
      'coffee mug',
      'cup',
      'teapot',
      'coffeepot',
      'wine bottle',
      'beer bottle',
      'beer glass',
      'goblet',
      'soup bowl',
      'plate',
      'frying pan',
      'wok',
      'crock pot',
      'banana',
      'pineapple',
      'carbonara',
    ],
  },
  {
    category: 'Landscape / Architecture',
    keywords: [
      'valley',
      'alp',
      'volcano',
      'cliff',
      'lakeside',
      'seashore',
      'sandbar',
      'promontory',
      'geyser',
      'church',
      'castle',
      'palace',
      'mosque',
      'monastery',
      'stupa',
      'triumphal arch',
      'lighthouse',
      'suspension bridge',
      'steel arch bridge',
      'viaduct',
      'dam',
      'beacon',
      'mobile home',
      'manufactured home',
      'boathouse',
      'patio',
      'barn',
      'greenhouse',
      'picket fence',
      'fountain',
      'dock',
      'pier',
      'cabana',
    ],
  },
  {
    category: 'Electronics / Furniture / Everyday Object',
    keywords: [
      'laptop',
      'notebook computer',
      'cellular telephone',
      'ipod',
      'computer keyboard',
      'space bar',
      'printer',
      'photocopier',
      'desk',
      'dining table',
      'sofa',
      'studio couch',
      'rocking chair',
      'folding chair',
      'barber chair',
      'throne',
      'park bench',
      'bookcase',
      'bookshop',
      'book jacket',
      'umbrella',
      'backpack',
      'acoustic guitar',
      'electric guitar',
      'grand piano',
      'upright piano',
      'violin',
      'cello',
      'drum',
      'saxophone',
      'trumpet',
      'soccer ball',
      'basketball',
      'tennis ball',
      'baseball',
      'volleyball',
      'golf ball',
      'refrigerator',
      'microwave',
      'toaster',
      'washer',
      'vacuum',
      'lawn mower',
      'traffic light',
      'street sign',
      'parking meter',
      'mailbox',
      'pay-phone',
      'sunglasses',
      'wristwatch',
      'analog clock',
      'digital clock',
      'wall clock',
      'reflex camera',
      'polaroid camera',
    ],
  },
];

// Hard non-medical COCO object classes (excludes 'person', 'tv', 'clock', 'bird', 'tie', 'scissors'
// which can appear on clinical skin close-ups, ultrasound screens, CT circles, or mammograms).
const NON_MEDICAL_COCO_MAP: Record<string, string> = {
  car: 'Vehicle / Transportation',
  truck: 'Vehicle / Transportation',
  bus: 'Vehicle / Transportation',
  motorcycle: 'Vehicle / Transportation',
  bicycle: 'Vehicle / Transportation',
  airplane: 'Vehicle / Transportation',
  train: 'Vehicle / Transportation',
  boat: 'Vehicle / Transportation',
  cat: 'Animal / Wildlife',
  dog: 'Animal / Wildlife',
  horse: 'Animal / Wildlife',
  sheep: 'Animal / Wildlife',
  cow: 'Animal / Wildlife',
  elephant: 'Animal / Wildlife',
  bear: 'Animal / Wildlife',
  zebra: 'Animal / Wildlife',
  giraffe: 'Animal / Wildlife',
  pizza: 'Food / Beverage / Tableware',
  sandwich: 'Food / Beverage / Tableware',
  'hot dog': 'Food / Beverage / Tableware',
  donut: 'Food / Beverage / Tableware',
  cake: 'Food / Beverage / Tableware',
  banana: 'Food / Beverage / Tableware',
  apple: 'Food / Beverage / Tableware',
  orange: 'Food / Beverage / Tableware',
  broccoli: 'Food / Beverage / Tableware',
  carrot: 'Food / Beverage / Tableware',
  cup: 'Food / Beverage / Tableware',
  'wine glass': 'Food / Beverage / Tableware',
  bottle: 'Food / Beverage / Tableware',
  bowl: 'Food / Beverage / Tableware',
  fork: 'Food / Beverage / Tableware',
  knife: 'Food / Beverage / Tableware',
  spoon: 'Food / Beverage / Tableware',
  laptop: 'Electronics / Furniture / Everyday Object',
  'cell phone': 'Electronics / Furniture / Everyday Object',
  keyboard: 'Electronics / Furniture / Everyday Object',
  mouse: 'Electronics / Furniture / Everyday Object',
  remote: 'Electronics / Furniture / Everyday Object',
  book: 'Electronics / Furniture / Everyday Object',
  chair: 'Electronics / Furniture / Everyday Object',
  couch: 'Electronics / Furniture / Everyday Object',
  bed: 'Electronics / Furniture / Everyday Object',
  'dining table': 'Electronics / Furniture / Everyday Object',
  'potted plant': 'Electronics / Furniture / Everyday Object',
  refrigerator: 'Electronics / Furniture / Everyday Object',
  microwave: 'Electronics / Furniture / Everyday Object',
  oven: 'Electronics / Furniture / Everyday Object',
  toaster: 'Electronics / Furniture / Everyday Object',
  sink: 'Electronics / Furniture / Everyday Object',
  toilet: 'Electronics / Furniture / Everyday Object',
  umbrella: 'Electronics / Furniture / Everyday Object',
  backpack: 'Electronics / Furniture / Everyday Object',
  handbag: 'Electronics / Furniture / Everyday Object',
  suitcase: 'Electronics / Furniture / Everyday Object',
  'sports ball': 'Electronics / Furniture / Everyday Object',
  'tennis racket': 'Electronics / Furniture / Everyday Object',
  'baseball bat': 'Electronics / Furniture / Everyday Object',
  skateboard: 'Electronics / Furniture / Everyday Object',
  surfboard: 'Electronics / Furniture / Everyday Object',
  'traffic light': 'Landscape / Architecture',
  'stop sign': 'Landscape / Architecture',
  'fire hydrant': 'Landscape / Architecture',
};

const NON_MEDICAL_IMAGENET_MATCHERS = NON_MEDICAL_IMAGENET_GROUPS.map((group) => ({
  category: group.category,
  regexes: group.keywords.map((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`);
  }),
}));

function matchImageNetCategory(rawLabel: string): string | null {
  const parts = rawLabel
    .toLowerCase()
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const group of NON_MEDICAL_IMAGENET_MATCHERS) {
    for (const part of parts) {
      if (group.regexes.some((re) => re.test(part))) {
        return group.category;
      }
    }
  }
  return null;
}

function cleanPrimaryLabel(rawLabel: string): string {
  const first = rawLabel.split(',')[0]?.trim() || rawLabel.trim();
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Evaluates whether client-side ImageNet and/or object detection predictions indicate
 * an everyday non-medical image (car, animal, food, landscape, laptop, etc.).
 */
export function evaluateNonMedicalDomain(input: NonMedicalDomainInput): NonMedicalEvaluation {
  const imageNet = input.imageNetPredictions ?? [];
  const detections = input.objectDetections ?? [];

  // 1. Check COCO-SSD hard non-medical objects first (catches B&W cars, pets, cups, laptops cleanly)
  const matchedObjects = detections
    .map((det) => {
      const normalized = det.className.trim().toLowerCase();
      const category = NON_MEDICAL_COCO_MAP[normalized];
      return category ? { det, category } : null;
    })
    .filter((x): x is { det: ObjectDetectionPrediction; category: string } => Boolean(x))
    .sort((a, b) => b.det.score - a.det.score);

  if (matchedObjects.length > 0 && matchedObjects[0].det.score >= 0.72) {
    const best = matchedObjects[0];
    const conf = Math.max(0, Math.min(1, best.det.score));
    const pct = (conf * 100).toFixed(1);
    return {
      isUnrelated: true,
      detectedSubject: cleanPrimaryLabel(best.det.className),
      subjectCategory: best.category,
      confidence: conf,
      formattedConfidence: `${pct}%`,
      detectorSource: 'ObjectDetector',
    };
  }

  // 2. Check ImageNet top predictions grouped by non-medical domain
  const categoryTotals = new Map<string, { sum: number; topLabel: string; topProb: number }>();

  for (const pred of imageNet) {
    const category = matchImageNetCategory(pred.className);
    if (!category) continue;
    const prob = Math.max(0, Math.min(1, Number(pred.probability ?? 0)));
    const current = categoryTotals.get(category);
    if (!current) {
      categoryTotals.set(category, {
        sum: prob,
        topLabel: cleanPrimaryLabel(pred.className),
        topProb: prob,
      });
    } else {
      current.sum += prob;
      if (prob > current.topProb) {
        current.topProb = prob;
        current.topLabel = cleanPrimaryLabel(pred.className);
      }
    }
  }

  let bestGroup: { category: string; sum: number; topLabel: string; topProb: number } | null = null;
  for (const [category, stats] of categoryTotals.entries()) {
    if (!bestGroup || stats.sum > bestGroup.sum) {
      bestGroup = { category, ...stats };
    }
  }

  if (bestGroup && (bestGroup.sum >= 0.35 || bestGroup.topProb >= 0.28)) {
    const conf = Math.max(0, Math.min(1, bestGroup.sum));
    const pct = (conf * 100).toFixed(1);
    return {
      isUnrelated: true,
      detectedSubject: bestGroup.topLabel,
      subjectCategory: bestGroup.category,
      confidence: conf,
      formattedConfidence: `${pct}%`,
      detectorSource: 'ImageNet',
    };
  }

  return { isUnrelated: false };
}

/**
 * Builds an UnrelatedImageDetection object combining non-medical domain findings
 * with the raw Stage 1 Universal Classifier output.
 */
export function buildUnrelatedImageDetection(
  evaluation: Extract<NonMedicalEvaluation, { isUnrelated: true }>,
  universalPredictions: RawPrediction[]
): UnrelatedImageDetection {
  const { topClass, allScores } = universalPredictions.length > 0
    ? processScores(universalPredictions)
    : { topClass: null, allScores: [] };

  const explanation =
    `Non-medical subject detected: "${evaluation.detectedSubject}" (${evaluation.subjectCategory}, ${evaluation.formattedConfidence}). ` +
    `This image appears to be an unrelated everyday picture rather than one of the 7 supported medical imaging categories, so no specialized disease classifier was run.`;

  return {
    isUnrelated: true,
    detectedSubject: evaluation.detectedSubject,
    subjectCategory: evaluation.subjectCategory,
    confidence: evaluation.confidence,
    formattedConfidence: evaluation.formattedConfidence,
    detectorSource: evaluation.detectorSource,
    universalTopCandidate: topClass,
    allUniversalScores: allScores,
    explanation,
  };
}
