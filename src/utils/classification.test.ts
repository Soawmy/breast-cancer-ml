import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNIVERSAL_MODEL_SPEC,
  SPECIALIZED_MODELS,
  SPECIALIZED_MODEL_LIST,
  UniversalCategory,
  formatLabel,
  normalizeUniversalCategory,
  getClassDescription,
  validateUploadImage,
  checkImagePixelVariance,
  determineUniversalCategory,
  evaluateNonMedicalDomain,
  buildUnrelatedImageDetection,
  processScores,
  buildClassificationResult,
  RawPrediction,
} from './classification';

test('model registry includes universal classifier and all 7 specialized routes without legacy model', () => {
  assert.equal(UNIVERSAL_MODEL_SPEC.modelUrl, 'https://teachablemachine.withgoogle.com/models/9v7G7hmAY/');
  assert.equal(UNIVERSAL_MODEL_SPEC.classes.length, 7);
  assert.equal(SPECIALIZED_MODEL_LIST.length, 7);

  const expectedRoutes: Record<UniversalCategory, string> = {
    Brain_CT: 'https://teachablemachine.withgoogle.com/models/mlMAgmz2b/',
    Brain_MRI: 'https://teachablemachine.withgoogle.com/models/DzBtWne84/',
    Knee_Xray: 'https://teachablemachine.withgoogle.com/models/oEwbUYRWS/',
    Skin_Photo: 'https://teachablemachine.withgoogle.com/models/SCeO8fwh6/',
    Breast_Mammogram: 'https://teachablemachine.withgoogle.com/models/z8kfp45Hr/',
    Breast_Ultrasound: 'https://teachablemachine.withgoogle.com/models/KkUeH33bv/',
    Lung_CT: 'https://teachablemachine.withgoogle.com/models/bIu7wqmgS/',
  };

  for (const [cat, url] of Object.entries(expectedRoutes)) {
    const spec = SPECIALIZED_MODELS[cat as UniversalCategory];
    assert.ok(spec, `Missing specialized model for ${cat}`);
    assert.equal(spec.modelUrl, url);
    assert.notEqual(spec.modelUrl, 'https://teachablemachine.withgoogle.com/models/4J1sLOtpZ/');
  }
});

test('normalizeUniversalCategory maps all 7 classes cleanly', () => {
  assert.equal(normalizeUniversalCategory('Brain_CT'), 'Brain_CT');
  assert.equal(normalizeUniversalCategory(' brain_mri '), 'Brain_MRI');
  assert.equal(normalizeUniversalCategory('Knee_Xray'), 'Knee_Xray');
  assert.equal(normalizeUniversalCategory('Breast_Mammogram'), 'Breast_Mammogram');
  assert.equal(normalizeUniversalCategory('Breast_Ultrasound'), 'Breast_Ultrasound');
  assert.equal(normalizeUniversalCategory('Lung_CT'), 'Lung_CT');
  assert.equal(normalizeUniversalCategory('Skin_Photo'), 'Skin_Photo');
  assert.equal(normalizeUniversalCategory('Dental_Xray'), null);
});

test('formatLabel trims, formats readable labels, and preserves SJS_TEN', () => {
  assert.equal(formatLabel('benign'), 'Benign');
  assert.equal(formatLabel('normal '), 'Normal');
  assert.equal(formatLabel('malignant'), 'Malignant');
  assert.equal(formatLabel('Pituitary_Tumor'), 'Pituitary Tumor');
  assert.equal(formatLabel('Nail_Psoriasis'), 'Nail Psoriasis');
  assert.equal(formatLabel('SJS_TEN'), 'SJS_TEN');
  assert.equal(formatLabel('Brain_MRI'), 'Brain MRI');
  assert.equal(formatLabel(''), '');
});

test('getClassDescription returns accurate category-specific descriptions', () => {
  // Breast descriptions preserved
  assert.match(
    getClassDescription('benign', 'Breast_Ultrasound'),
    /^A benign breast finding is a non-cancerous abnormality/
  );
  assert.match(
    getClassDescription('Malignant', 'Breast_Mammogram'),
    /^A malignant breast finding refers to an abnormality/
  );
  assert.match(
    getClassDescription('normal '),
    /^A normal classification means the model did not identify/
  );

  // Lung CT uses Lung-specific descriptions instead of Breast descriptions
  assert.match(getClassDescription('Benign', 'Lung_CT'), /Lung Cancer Classifier/);
  assert.doesNotMatch(getClassDescription('Benign', 'Lung_CT'), /breast/i);
  assert.match(getClassDescription('Malignant', 'Lung_CT'), /Lung Cancer Classifier/);
  assert.match(getClassDescription('Normal', 'Lung_CT'), /Lung Cancer Classifier/);

  // Other specialized categories
  assert.match(getClassDescription('Aneurysm', 'Brain_CT'), /Brain CT Classifier/);
  assert.match(getClassDescription('Pituitary_Tumor', 'Brain_MRI'), /Brain Cancer MRI Classifier/);
  assert.match(getClassDescription('Osteopenia', 'Knee_Xray'), /Knee X-ray Osteoporosis Classifier/);
  assert.match(getClassDescription('SJS_TEN', 'Skin_Photo'), /Skin Condition Classifier/);
  assert.equal(getClassDescription('unknown_class', 'Brain_CT'), '');
});

test('determineUniversalCategory routes all 7 confident categories to the exact specialized model', () => {
  const categories: UniversalCategory[] = [
    'Brain_CT',
    'Brain_MRI',
    'Knee_Xray',
    'Breast_Mammogram',
    'Breast_Ultrasound',
    'Lung_CT',
    'Skin_Photo',
  ];

  for (const cat of categories) {
    const preds: RawPrediction[] = categories.map((c) => ({
      className: c,
      probability: c === cat ? 0.88 : 0.02,
    }));

    const decision = determineUniversalCategory(preds);
    assert.equal(decision.confident, true, `Expected ${cat} to be confident`);
    if (decision.confident) {
      assert.equal(decision.category, cat);
      assert.equal(decision.specializedModel.category, cat);
      assert.equal(decision.specializedModel.modelUrl, SPECIALIZED_MODELS[cat].modelUrl);
      assert.equal(decision.formattedPercentage, '88.0%');
      assert.equal(decision.allScores.length, 7);
    }
  }
});

test('determineUniversalCategory blocks routing on low confidence, ties, empty, or unrecognized classes', () => {
  // Low confidence (< 55%)
  const lowConf: RawPrediction[] = [
    { className: 'Brain_CT', probability: 0.41 },
    { className: 'Lung_CT', probability: 0.32 },
    { className: 'Skin_Photo', probability: 0.27 },
  ];
  const lowDecision = determineUniversalCategory(lowConf);
  assert.equal(lowDecision.confident, false);
  if (!lowDecision.confident) {
    assert.equal(lowDecision.reason, 'low_confidence');
    assert.equal(lowDecision.topCandidate?.className, 'Brain_CT');
    assert.equal(lowDecision.allScores.length, 3);
  }

  // Ambiguous tie (< 70% top and margin < 15%)
  const tieConf: RawPrediction[] = [
    { className: 'Brain_CT', probability: 0.56 },
    { className: 'Brain_MRI', probability: 0.44 },
  ];
  const tieDecision = determineUniversalCategory(tieConf);
  assert.equal(tieDecision.confident, false);
  if (!tieDecision.confident) {
    assert.equal(tieDecision.reason, 'ambiguous_tie');
  }

  // Unrecognized class
  const invalidClass: RawPrediction[] = [{ className: 'Chest_Xray', probability: 0.99 }];
  const invalidDecision = determineUniversalCategory(invalidClass);
  assert.equal(invalidDecision.confident, false);
  if (!invalidDecision.confident) {
    assert.equal(invalidDecision.reason, 'unrecognized_class');
  }

  // Empty predictions
  const emptyDecision = determineUniversalCategory([]);
  assert.equal(emptyDecision.confident, false);
  if (!emptyDecision.confident) {
    assert.equal(emptyDecision.reason, 'empty_predictions');
  }
});

test('processScores clamps, sorts, and preserves exact raw className', () => {
  const raw: RawPrediction[] = [
    { className: 'Meningioma', probability: 0.12 },
    { className: 'Pituitary_Tumor', probability: 0.86 },
    { className: 'Glioma', probability: 0.02 },
  ];

  const { topClass, allScores } = processScores(raw);
  assert.equal(topClass.className, 'Pituitary_Tumor');
  assert.equal(topClass.displayName, 'Pituitary Tumor');
  assert.equal(topClass.formattedPercentage, '86.0%');
  assert.equal(allScores[0].className, 'Pituitary_Tumor');
  assert.equal(allScores[1].className, 'Meningioma');
  assert.equal(allScores[2].className, 'Glioma');

  const clamped = processScores([
    { className: 'benign', probability: 1.4 },
    { className: 'malignant', probability: -0.2 },
  ]);
  assert.equal(clamped.allScores[0].formattedPercentage, '100.0%');
  assert.equal(clamped.allScores[1].formattedPercentage, '0.0%');
});

test('buildClassificationResult constructs full 2-stage result and flags borderline specialized confidence', () => {
  const decision = determineUniversalCategory([
    { className: 'Brain_MRI', probability: 0.96 },
    { className: 'Brain_CT', probability: 0.04 },
  ]);
  assert.equal(decision.confident, true);
  if (!decision.confident) return;

  const confidentResult = buildClassificationResult(decision, [
    { className: 'Glioma', probability: 0.91 },
    { className: 'Meningioma', probability: 0.06 },
    { className: 'Pituitary_Tumor', probability: 0.03 },
  ]);
  assert.equal(confidentResult.universal.category, 'Brain_MRI');
  assert.equal(confidentResult.modelName, 'Brain Cancer MRI Classifier');
  assert.equal(confidentResult.topClass.className, 'Glioma');
  assert.equal(confidentResult.isLowConfidence, false);
  assert.equal(confidentResult.confidenceNote, null);
  assert.match(confidentResult.pipelineSummary, /Brain_MRI \(96.0%\)/);
  assert.match(confidentResult.pipelineSummary, /Glioma \(91.0%\)/);

  const borderlineResult = buildClassificationResult(decision, [
    { className: 'Glioma', probability: 0.48 },
    { className: 'Meningioma', probability: 0.43 },
    { className: 'Pituitary_Tumor', probability: 0.09 },
  ]);
  assert.equal(borderlineResult.isLowConfidence, true);
  assert.ok(borderlineResult.confidenceNote);
});

test('validateUploadImage checks valid formats, empty files, unknown extensions, and size limits', () => {
  const validJpg = new File(['dummy'], 'scan.jpg', { type: 'image/jpeg' });
  const validPng = new File(['dummy'], 'scan.png', { type: 'image/png' });
  const emptyMimeValidExt = new File(['dummy'], 'scan.jpeg', { type: '' });
  const emptyMimeBadExt = new File(['dummy'], 'notes.txt', { type: '' });
  const invalidPdf = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });
  const zeroByte = new File([], 'empty.png', { type: 'image/png' });
  const hugeFile = { name: 'huge.png', type: 'image/png', size: 31 * 1024 * 1024 } as File;

  assert.equal(validateUploadImage(validJpg).valid, true);
  assert.equal(validateUploadImage(validPng).valid, true);
  assert.equal(validateUploadImage(emptyMimeValidExt).valid, true);
  assert.equal(validateUploadImage(emptyMimeBadExt).valid, false);
  assert.equal(validateUploadImage(invalidPdf).valid, false);
  assert.equal(validateUploadImage(zeroByte).valid, false);
  assert.equal(validateUploadImage(hugeFile).valid, false);
});

test('checkImagePixelVariance rejects blank/solid images and accepts varied image pixels', () => {
  const solidBlue = new Uint8ClampedArray(64 * 4);
  for (let i = 0; i < 64; i++) {
    solidBlue[i * 4] = 20;
    solidBlue[i * 4 + 1] = 120;
    solidBlue[i * 4 + 2] = 220;
    solidBlue[i * 4 + 3] = 255;
  }
  const solidCheck = checkImagePixelVariance(solidBlue, 4);
  assert.equal(solidCheck.valid, false);
  assert.ok(solidCheck.reason);

  const variedScan = new Uint8ClampedArray(64 * 4);
  for (let i = 0; i < 64; i++) {
    const val = i < 32 ? 15 : 210;
    variedScan[i * 4] = val;
    variedScan[i * 4 + 1] = val;
    variedScan[i * 4 + 2] = val;
    variedScan[i * 4 + 3] = 255;
  }
  const variedCheck = checkImagePixelVariance(variedScan, 4);
  assert.equal(variedCheck.valid, true);
});

test('evaluateNonMedicalDomain detects cars, pets, food, laptops, and landscapes as unrelated', () => {
  const sportsCar = evaluateNonMedicalDomain({
    imageNetPredictions: [
      { className: 'sports car, sport car', probability: 0.432 },
      { className: 'convertible', probability: 0.334 },
      { className: 'grille, radiator grille', probability: 0.072 },
    ],
  });
  assert.equal(sportsCar.isUnrelated, true);
  if (sportsCar.isUnrelated) {
    assert.equal(sportsCar.detectedSubject, 'Sports car');
    assert.equal(sportsCar.subjectCategory, 'Vehicle / Transportation');
    assert.equal(sportsCar.detectorSource, 'ImageNet');
  }

  const bwCar = evaluateNonMedicalDomain({
    imageNetPredictions: [{ className: 'racer, race car, racing car', probability: 0.09 }],
    objectDetections: [{ className: 'car', score: 0.915 }],
  });
  assert.equal(bwCar.isUnrelated, true);
  if (bwCar.isUnrelated) {
    assert.equal(bwCar.detectedSubject, 'Car');
    assert.equal(bwCar.detectorSource, 'ObjectDetector');
  }

  const dog = evaluateNonMedicalDomain({
    imageNetPredictions: [{ className: 'golden retriever', probability: 0.972 }],
  });
  assert.equal(dog.isUnrelated, true);

  const mug = evaluateNonMedicalDomain({
    imageNetPredictions: [
      { className: 'coffee mug', probability: 0.425 },
      { className: 'cup', probability: 0.216 },
    ],
  });
  assert.equal(mug.isUnrelated, true);

  const landscape = evaluateNonMedicalDomain({
    imageNetPredictions: [
      { className: 'valley, vale', probability: 0.363 },
      { className: 'alp', probability: 0.26 },
    ],
  });
  assert.equal(landscape.isUnrelated, true);

  const house = evaluateNonMedicalDomain({
    imageNetPredictions: [
      { className: 'mobile home, manufactured home', probability: 0.308 },
      { className: 'patio, terrace', probability: 0.142 },
    ],
  });
  assert.equal(house.isUnrelated, true);
});

test('evaluateNonMedicalDomain never falsely rejects clinical scans or dermatology lookalikes', () => {
  const mammogram = evaluateNonMedicalDomain({
    imageNetPredictions: [{ className: 'head cabbage', probability: 0.063 }],
    objectDetections: [{ className: 'bird', score: 0.7 }],
  });
  assert.equal(mammogram.isUnrelated, false);

  const ultrasoundMonitor = evaluateNonMedicalDomain({
    imageNetPredictions: [
      { className: 'monitor', probability: 0.434 },
      { className: 'screen, CRT screen', probability: 0.27 },
    ],
    objectDetections: [{ className: 'tv', score: 0.827 }],
  });
  assert.equal(ultrasoundMonitor.isUnrelated, false);

  const brainMri = evaluateNonMedicalDomain({
    imageNetPredictions: [{ className: 'shield, buckler', probability: 0.117 }],
    objectDetections: [{ className: 'clock', score: 0.972 }],
  });
  assert.equal(brainMri.isUnrelated, false);

  const skinVitiligo = evaluateNonMedicalDomain({
    imageNetPredictions: [
      { className: 'Band Aid', probability: 0.95 },
      { className: 'sunscreen, sunblock, sun blocker', probability: 0.021 },
    ],
    objectDetections: [{ className: 'person', score: 0.89 }],
  });
  assert.equal(skinVitiligo.isUnrelated, false);

  const nailPsoriasis = evaluateNonMedicalDomain({
    imageNetPredictions: [
      { className: 'sandal', probability: 0.909 },
      { className: 'clog, geta, patten, sabot', probability: 0.071 },
    ],
    objectDetections: [{ className: 'person', score: 0.855 }],
  });
  assert.equal(nailPsoriasis.isUnrelated, false);
});

test('buildUnrelatedImageDetection preserves raw universal scores and formats explanation', () => {
  const evalRes = evaluateNonMedicalDomain({
    imageNetPredictions: [{ className: 'sports car, sport car', probability: 0.85 }],
  });
  assert.equal(evalRes.isUnrelated, true);
  if (!evalRes.isUnrelated) return;

  const built = buildUnrelatedImageDetection(evalRes, [
    { className: 'Skin_Photo', probability: 0.99 },
    { className: 'Brain_CT', probability: 0.01 },
  ]);
  assert.equal(built.detectedSubject, 'Sports car');
  assert.equal(built.universalTopCandidate?.className, 'Skin_Photo');
  assert.equal(built.allUniversalScores.length, 2);
  assert.match(built.explanation, /Sports car/);
});
