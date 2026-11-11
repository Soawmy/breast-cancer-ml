import React from 'react';
import { SPECIALIZED_MODEL_LIST } from '../utils/classification';

function VerticalConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center my-1" aria-hidden="true">
      <div className="w-px h-4 bg-neutral-300" />
      {label && (
        <span className="my-0.5 text-[11px] font-medium text-neutral-500 whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="w-px h-3 bg-neutral-300" />
      <svg width="8" height="6" viewBox="0 0 8 6" className="text-neutral-500 shrink-0">
        <path d="M0 0L4 6L8 0Z" fill="currentColor" />
      </svg>
    </div>
  );
}

export function PipelineDiagramSection() {
  const branchCount = SPECIALIZED_MODEL_LIST.length;
  const edgeOffsetPct = `${(0.5 / branchCount) * 100}%`;

  return (
    <section
      aria-labelledby="ml-pipeline-diagram-heading"
      className="w-full mt-8 bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 shadow-xs"
    >
      <div className="pb-4 border-b border-neutral-200">
        <h2
          id="ml-pipeline-diagram-heading"
          className="text-base font-semibold text-neutral-900"
        >
          ML Pipeline Diagram
        </h2>
      </div>

      <div className="pt-6 flex flex-col items-center w-full">
        {/* Step 1: Image Upload */}
        <div className="w-full max-w-xs rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-center">
          <div className="text-xs font-semibold text-neutral-900">1. Image Upload</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            PNG, JPG, JPEG · Pixel-variance check
          </div>
        </div>

        <VerticalConnector />

        {/* Step 2: Image-Type Detection */}
        <div className="w-full max-w-xs rounded-md border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-center">
          <div className="text-xs font-semibold text-neutral-900">
            2. Image-Type Detection (Stage 1)
          </div>
          <div className="text-[11px] text-neutral-600 mt-0.5">Image Classifier</div>
        </div>

        {/* Connector from Image Classifier to Stage 2 Routing */}
        <div className="flex flex-col items-center mt-1" aria-hidden="true">
          <div className="w-px h-4 bg-neutral-300" />
          <span className="my-0.5 text-[11px] font-medium text-blue-700 whitespace-nowrap">
            3. Route to Specialized Classifier
          </span>
        </div>

        {/* Step 3: Specialized Model Routing — Desktop Tree */}
        <div className="hidden md:block w-full">
          {/* Splitter Bus */}
          <div className="relative w-full h-8" aria-hidden="true">
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-px h-3.5 bg-neutral-300" />
            <div
              className="absolute top-3.5 h-px bg-neutral-300"
              style={{ left: edgeOffsetPct, right: edgeOffsetPct }}
            />
            {SPECIALIZED_MODEL_LIST.map((spec, idx) => {
              const centerPct = `${((idx + 0.5) / branchCount) * 100}%`;
              return (
                <div
                  key={spec.category}
                  className="absolute top-3.5 -translate-x-1/2 flex flex-col items-center"
                  style={{ left: centerPct }}
                >
                  <div className="w-px h-3 bg-neutral-300" />
                  <svg width="8" height="6" viewBox="0 0 8 6" className="text-neutral-500">
                    <path d="M0 0L4 6L8 0Z" fill="currentColor" />
                  </svg>
                </div>
              );
            })}
          </div>

          {/* 7 Specialized Classifier Nodes */}
          <div className="grid grid-cols-7 w-full">
            {SPECIALIZED_MODEL_LIST.map((spec) => (
              <div key={spec.category} className="px-1 flex">
                <div className="w-full rounded-md border border-neutral-200 bg-neutral-50/70 px-1.5 py-2.5 text-center flex flex-col justify-between gap-1">
                  <div className="text-[10.5px] font-medium text-blue-700 leading-tight">
                    {spec.categoryDisplayName}
                  </div>
                  <div className="text-[11px] font-semibold text-neutral-900 leading-snug">
                    {spec.modelName}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Collector Bus */}
          <div className="relative w-full h-9 mb-1" aria-hidden="true">
            {SPECIALIZED_MODEL_LIST.map((spec, idx) => {
              const centerPct = `${((idx + 0.5) / branchCount) * 100}%`;
              return (
                <div
                  key={spec.category}
                  className="absolute top-0 -translate-x-1/2 w-px h-3.5 bg-neutral-300"
                  style={{ left: centerPct }}
                />
              );
            })}
            <div
              className="absolute top-3.5 h-px bg-neutral-300"
              style={{ left: edgeOffsetPct, right: edgeOffsetPct }}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-3.5 flex flex-col items-center">
              <div className="w-px h-4 bg-neutral-300" />
              <svg width="8" height="6" viewBox="0 0 8 6" className="text-neutral-500">
                <path d="M0 0L4 6L8 0Z" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>

        {/* Step 3: Specialized Model Routing — Mobile Stack */}
        <div className="md:hidden w-full max-w-xs mt-1 flex flex-col items-center">
          <div className="relative w-full h-3" aria-hidden="true">
            <div className="absolute left-1/2 top-0 w-px h-full bg-neutral-300" />
            <div className="absolute left-5 right-1/2 bottom-0 h-px bg-neutral-300" />
          </div>
          <div className="w-full pl-5 relative flex flex-col gap-2 pt-2">
            <div
              className="absolute left-5 top-0 bottom-[22px] w-px bg-neutral-300"
              aria-hidden="true"
            />
            {SPECIALIZED_MODEL_LIST.map((spec) => (
              <div key={spec.category} className="relative flex items-center pl-4">
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-neutral-300"
                  aria-hidden="true"
                />
                <svg
                  width="6"
                  height="8"
                  viewBox="0 0 6 8"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500"
                  aria-hidden="true"
                >
                  <path d="M0 0L6 4L0 8Z" fill="currentColor" />
                </svg>
                <div className="w-full rounded-md border border-neutral-200 bg-neutral-50/70 px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-blue-700 shrink-0">
                    {spec.categoryDisplayName}
                  </span>
                  <span className="text-xs font-semibold text-neutral-900 text-right">
                    {spec.modelName}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <VerticalConnector />
        </div>

        {/* Step 4: Prediction & Confidence Display */}
        <div className="w-full max-w-xs rounded-md border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-center">
          <div className="text-xs font-semibold text-neutral-900">
            4. Display Prediction &amp; Confidence Scores
          </div>
          <div className="text-[11px] text-neutral-600 mt-0.5">
            Detected category · Specialized result · Explanation
          </div>
        </div>
      </div>
    </section>
  );
}
