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

export interface ImagingTypeResult {
  imagingType: 'Ultrasound' | 'Mammogram';
  confidence: number;
  percentage: number;
  formattedPercentage: string;
}

export interface ClassificationResult {
  imagingType: ImagingTypeResult;
  modelName: string;
  modelUrl?: string;
  topClass: ClassScore;
  allScores: ClassScore[];
  description: string;
}

/**
 * Capitalizes the raw label for clean presentation while handling trailing spaces
 * (e.g. Model 2 has "normal ")
 */
export function formatLabel(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Returns the exact short explanation specified for each class
 */
export function getClassDescription(rawClassName: string): string {
  if (!rawClassName) return '';
  const norm = rawClassName.trim().toLowerCase();

  // Required exact explanations
  if (norm === 'benign') {
    return 'A benign breast finding is a non-cancerous abnormality in breast tissue. Common examples include breast cysts and fibroadenomas. Although benign findings are not cancer, some may still require monitoring or medical evaluation.';
  }
  if (norm === 'malignant') {
    return 'A malignant breast finding refers to an abnormality associated with cancerous growth. Malignant tumors can invade surrounding tissue and may spread to other parts of the body. Further medical evaluation and, when indicated, a biopsy are needed to establish a diagnosis.';
  }
  if (norm === 'normal') {
    return 'A normal classification means the model did not identify an abnormality in the uploaded image. However, this does not guarantee that the breast is free of disease or rule out cancer. A complete medical assessment requires appropriate imaging interpretation by a qualified radiologist.';
  }

  // BI-RADS classes if applicable
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
 * Validates file format and size for image upload
 * Accepts PNG, JPG, and JPEG as requested
 */
export function validateUploadImage(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Please select an image file.' };
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const hasValidExt = /\.(jpe?g|png)$/i.test(file.name);

  if (file.type && !allowedTypes.includes(file.type.toLowerCase()) && !hasValidExt) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a PNG, JPG, or JPEG image.',
    };
  }

  // File size limit: 30 MB
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
 * Determines imaging type from Model 3 predictions
 * Returns null if confidence is below threshold or label is unrecognized
 */
export function determineImagingType(
  typePredictions: RawPrediction[],
  minConfidence = 0.5
): ImagingTypeResult | null {
  if (!typePredictions || typePredictions.length === 0) {
    return null;
  }

  // Sort descending by probability
  const sorted = [...typePredictions].sort((a, b) => b.probability - a.probability);
  const top = sorted[0];

  if (!top || top.probability < minConfidence) {
    return null;
  }

  const norm = top.className.trim().toLowerCase();
  let identifiedType: 'Ultrasound' | 'Mammogram' | null = null;

  if (norm.includes('ultrasound')) {
    identifiedType = 'Ultrasound';
  } else if (norm.includes('mammogram')) {
    identifiedType = 'Mammogram';
  } else {
    return null;
  }

  const prob = Math.max(0, Math.min(1, top.probability));
  const percentage = Number((prob * 100).toFixed(1));

  return {
    imagingType: identifiedType,
    confidence: prob,
    percentage,
    formattedPercentage: `${percentage.toFixed(1)}%`,
  };
}

/**
 * Processes raw model predictions:
 * - Clamps probabilities to [0, 1]
 * - Formats percentage strings
 * - Sorts descending by probability
 */
export function processScores(predictions: RawPrediction[]): { topClass: ClassScore; allScores: ClassScore[] } {
  if (!predictions || predictions.length === 0) {
    throw new Error('No predictions returned by model.');
  }

  const scores: ClassScore[] = predictions.map((item) => {
    const probability = Math.max(0, Math.min(1, Number(item.probability ?? 0)));
    const percentage = Number((probability * 100).toFixed(1));
    return {
      className: item.className.trim(),
      displayName: formatLabel(item.className),
      probability,
      percentage,
      formattedPercentage: `${percentage.toFixed(1)}%`,
    };
  });

  // Sort descending by probability
  const sorted = [...scores].sort((a, b) => b.probability - a.probability);

  return {
    topClass: sorted[0],
    allScores: sorted,
  };
}

/**
 * Builds the complete ClassificationResult object given the imaging type and cancer model predictions
 */
export function buildClassificationResult(
  imagingType: ImagingTypeResult,
  cancerPredictions: RawPrediction[],
  modelName: string,
  modelUrl?: string
): ClassificationResult {
  const { topClass, allScores } = processScores(cancerPredictions);
  const description = getClassDescription(topClass.className);

  return {
    imagingType,
    modelName,
    modelUrl,
    topClass,
    allScores,
    description,
  };
}
