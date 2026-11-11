import React from 'react';
import { UNIVERSAL_MODEL_SPEC, SPECIALIZED_MODEL_LIST } from '../utils/classification';

interface ModelListItem {
  name: string;
  purpose: string;
}

const INTEGRATED_MODELS: ModelListItem[] = [
  {
    name: 'Image Classifier',
    purpose: `Classifies medical imaging category: ${UNIVERSAL_MODEL_SPEC.classes.join(', ')}.`,
  },
  ...SPECIALIZED_MODEL_LIST.map((spec) => ({
    name: spec.modelName,
    purpose: `Classifies ${spec.category} images: ${spec.classes.join(', ')}.`,
  })),
];

export function ModelsUsedSection() {
  return (
    <section
      aria-labelledby="ml-models-used-heading"
      className="w-full mt-6 bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 shadow-xs"
    >
      <div className="pb-4 border-b border-neutral-200">
        <h2
          id="ml-models-used-heading"
          className="text-base font-semibold text-neutral-900"
        >
          ML Models Used
        </h2>
      </div>

      <ul className="divide-y divide-neutral-200">
        {INTEGRATED_MODELS.map((model) => (
          <li
            key={model.name}
            className="py-3 last:pb-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-6"
          >
            <span className="text-sm font-medium text-neutral-900 sm:w-72 shrink-0">
              {model.name}
            </span>
            <span className="text-xs text-neutral-600 leading-relaxed flex-1">
              {model.purpose}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
