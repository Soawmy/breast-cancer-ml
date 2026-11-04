import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLabel,
  getClassDescription,
  validateUploadImage,
  determineImagingType,
  processScores,
  buildClassificationResult,
  RawPrediction,
} from './classification';

test('formatLabel capitalizes and trims labels correctly', () => {
  assert.equal(formatLabel('benign'), 'Benign');
  assert.equal(formatLabel('normal '), 'Normal');
  assert.equal(formatLabel('malignant'), 'Malignant');
  assert.equal(formatLabel('Mammogram'), 'Mammogram');
  assert.equal(formatLabel(''), '');
});

test('getClassDescription returns exact expected descriptions', () => {
  assert.match(getClassDescription('benign'), /^A benign breast finding is a non-cancerous abnormality/);
  assert.match(getClassDescription('Malignant'), /^A malignant breast finding refers to an abnormality/);
  assert.match(getClassDescription('normal '), /^A normal classification means the model did not identify/);
  assert.equal(getClassDescription('BI-RADS 2'), 'Benign finding.');
  assert.equal(getClassDescription('BI-RADS 3'), 'Probably benign finding.');
  assert.equal(getClassDescription('BI-RADS 4'), 'Suspicious finding.');
  assert.equal(getClassDescription('BI-RADS 5'), 'Highly suggestive of malignancy.');
  assert.equal(getClassDescription('unknown_class'), '');
});

test('determineImagingType identifies Ultrasound and Mammogram correctly', () => {
  const usPreds: RawPrediction[] = [
    { className: 'Mammogram', probability: 0.001 },
    { className: 'Ultrasound', probability: 0.999 },
  ];
  const usResult = determineImagingType(usPreds);
  assert.ok(usResult);
  assert.equal(usResult?.imagingType, 'Ultrasound');
  assert.equal(usResult?.formattedPercentage, '99.9%');

  const mammoPreds: RawPrediction[] = [
    { className: 'Mammogram', probability: 0.95 },
    { className: 'Ultrasound', probability: 0.05 },
  ];
  const mammoResult = determineImagingType(mammoPreds);
  assert.ok(mammoResult);
  assert.equal(mammoResult?.imagingType, 'Mammogram');
  assert.equal(mammoResult?.formattedPercentage, '95.0%');
});

test('determineImagingType rejects low-confidence or unrecognized classes', () => {
  // Low confidence (< 0.5)
  const lowConf: RawPrediction[] = [
    { className: 'Mammogram', probability: 0.48 },
    { className: 'Ultrasound', probability: 0.47 },
  ];
  assert.equal(determineImagingType(lowConf), null);

  // Unrecognized class
  const invalidClass: RawPrediction[] = [
    { className: 'Chest_XRay', probability: 0.99 },
  ];
  assert.equal(determineImagingType(invalidClass), null);
});

test('processScores clamps, sorts, and formats class predictions', () => {
  const raw: RawPrediction[] = [
    { className: 'benign', probability: 0.12 },
    { className: 'malignant', probability: 0.86 },
    { className: 'normal ', probability: 0.02 },
  ];

  const { topClass, allScores } = processScores(raw);
  assert.equal(topClass.className, 'malignant');
  assert.equal(topClass.displayName, 'Malignant');
  assert.equal(topClass.formattedPercentage, '86.0%');
  assert.equal(allScores[0].className, 'malignant');
  assert.equal(allScores[1].className, 'benign');
  assert.equal(allScores[2].className, 'normal');
});

test('buildClassificationResult constructs full result object', () => {
  const typeRes = {
    imagingType: 'Ultrasound' as const,
    confidence: 0.99,
    percentage: 99.0,
    formattedPercentage: '99.0%',
  };
  const cancerPreds: RawPrediction[] = [
    { className: 'benign', probability: 0.95 },
    { className: 'malignant', probability: 0.05 },
  ];

  const full = buildClassificationResult(typeRes, cancerPreds, 'Breast Ultrasound Classifier');
  assert.equal(full.imagingType.imagingType, 'Ultrasound');
  assert.equal(full.modelName, 'Breast Ultrasound Classifier');
  assert.equal(full.topClass.className, 'benign');
  assert.match(full.description, /^A benign breast finding/);
});

test('validateUploadImage checks valid file formats and sizes', () => {
  const validJpg = new File(['dummy'], 'scan.jpg', { type: 'image/jpeg' });
  const validPng = new File(['dummy'], 'scan.png', { type: 'image/png' });
  const invalidPdf = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });

  assert.equal(validateUploadImage(validJpg).valid, true);
  assert.equal(validateUploadImage(validPng).valid, true);
  assert.equal(validateUploadImage(invalidPdf).valid, false);
});
