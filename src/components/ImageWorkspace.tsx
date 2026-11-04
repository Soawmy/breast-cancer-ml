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

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    // Reset file input so re-selecting same file triggers change
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
        aria-label="Upload ultrasound or mammogram image"
      />

      {validationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{validationError}</span>
        </div>
      )}

      {!imageSrc ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerSelect();
            }
          }}
          className={`w-full border-2 border-dashed rounded-lg p-10 sm:p-14 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/60 hover:bg-neutral-50'
          }`}
          aria-label="Upload breast ultrasound or mammogram. Click or drag and drop."
        >
          <div className="flex flex-col items-center justify-center">
            <div className="p-3 bg-white rounded-full border border-neutral-200 shadow-sm text-neutral-500 mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-neutral-800">
              Upload ultrasound or mammogram image
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Drag and drop or click to select (PNG, JPG, JPEG)
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Image Preview */}
          <div className="w-full flex items-center justify-center bg-neutral-900 rounded-lg border border-neutral-200 overflow-hidden p-2 min-h-[260px] max-h-[380px]">
            <img
              id="breast-imaging-preview-img"
              src={imageSrc}
              alt={imageFile?.name || 'Image preview'}
              className="max-h-[360px] max-w-full w-auto h-auto object-contain rounded"
            />
          </div>

          {/* Small options to replace or remove */}
          <div className="flex items-center justify-between w-full px-1 text-xs text-neutral-600">
            <span className="truncate max-w-[200px] sm:max-w-xs font-mono text-neutral-500">
              {imageFile?.name || 'Scan image'}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={triggerSelect}
                disabled={isPredicting}
                className="flex items-center gap-1 font-medium text-neutral-700 hover:text-neutral-900 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Replace</span>
              </button>
              <span className="text-neutral-300" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={onRemoveImage}
                disabled={isPredicting}
                className="flex items-center gap-1 font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
