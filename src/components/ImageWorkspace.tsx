import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Upload, RefreshCw, X, AlertCircle } from 'lucide-react';
import { validateUploadImage } from '../utils/classification';

interface ImageWorkspaceProps {
  imageSrc: string | null;
  imageFile: File | null;
  onImageSelected: (file: File, dataUrl: string) => void;
  onRemoveImage: () => void;
  isPredicting: boolean;
}

export function ImageWorkspace({
  imageSrc,
  imageFile,
  onImageSelected,
  onRemoveImage,
  isPredicting,
}: ImageWorkspaceProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setValidationError(null);
    const validation = validateUploadImage(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Please upload a PNG, JPG, or JPEG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        onImageSelected(file, e.target.result);
      }
    };
    reader.onerror = () => {
      setValidationError('Failed to read the selected file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!isPredicting && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerSelect = () => {
    if (!isPredicting) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload medical image"
      />

      {validationError && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      {!imageSrc ? (
        <button
          type="button"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerSelect}
          disabled={isPredicting}
          className={`w-full border-2 border-dashed rounded-lg p-10 sm:p-14 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
            isDragging
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/60 hover:bg-neutral-50'
          }`}
          aria-label="Upload medical image. Click or drag and drop."
        >
          <span className="flex flex-col items-center justify-center">
            <span className="p-3 bg-white rounded-full border border-neutral-200 shadow-xs text-neutral-500 mb-3">
              <Upload className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-neutral-800">
              Upload medical image
            </span>
            <span className="text-xs text-neutral-500 mt-1">
              Drag and drop or click to select (PNG, JPG, JPEG)
            </span>
            <span className="text-[11px] text-neutral-400 mt-2 max-w-sm leading-relaxed">
              Supports Brain CT, Brain MRI, Knee X-ray, Breast Mammogram, Breast Ultrasound, Lung CT, and Skin Photo
            </span>
          </span>
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Image Preview */}
          <div className="w-full flex items-center justify-center bg-neutral-950 rounded-lg border border-neutral-200 overflow-hidden p-2 min-h-[260px] max-h-[380px]">
            <img
              id="medical-imaging-preview-img"
              src={imageSrc}
              alt={imageFile?.name || 'Uploaded medical image preview'}
              className="max-h-[360px] max-w-full w-auto h-auto object-contain rounded"
            />
          </div>

          {/* File name and Replace/Remove controls */}
          <div className="flex items-center justify-between gap-4 w-full px-0.5 text-xs text-neutral-600">
            <span
              className="flex-1 min-w-0 truncate font-mono text-neutral-500"
              title={imageFile?.name || 'Medical image'}
            >
              {imageFile?.name || 'Medical image'}
            </span>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={triggerSelect}
                disabled={isPredicting}
                className="inline-flex items-center gap-1.5 py-1 px-1.5 rounded font-medium text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Replace</span>
              </button>
              <span className="text-neutral-300 select-none" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={onRemoveImage}
                disabled={isPredicting}
                className="inline-flex items-center gap-1.5 py-1 px-1.5 rounded font-medium text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
