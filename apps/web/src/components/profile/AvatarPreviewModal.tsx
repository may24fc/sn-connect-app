'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hr-portal/ui';
import { Minus, Plus, RotateCcw, Upload, X, ZoomIn } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Crop the image on a canvas and return a File. */
async function getCroppedFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string,
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // Output a square at the cropped resolution (capped at 512px for perf).
  const size = Math.min(pixelCrop.width, 512);
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas toBlob failed'));
        return;
      }
      resolve(new File([blob], fileName, { type: 'image/png' }));
    }, 'image/png');
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────────

interface AvatarPreviewModalProps {
  /** The selected file to preview */
  file: File | null;
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close (cancel / after save) */
  onClose: () => void;
  /** Called when the user confirms the upload */
  onConfirm: (file: File) => Promise<void>;
  /** Whether an upload is currently in progress */
  isUploading: boolean;
  /** Fallback initials for the avatar ring */
  initials: string;
  /** Current avatar URL (shown as "before") */
  currentAvatarUrl?: string | undefined;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

// ─── Component ──────────────────────────────────────────────────────────────────

/**
 * Facebook-style avatar crop modal.
 * User can pan, zoom, and preview the circular crop before uploading.
 */
export function AvatarPreviewModal({
  file,
  open,
  onClose,
  onConfirm,
  isUploading,
  initials,
  currentAvatarUrl,
}: AvatarPreviewModalProps): React.ReactNode {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Create and revoke object URL for the selected file
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    // Reset crop state for new file
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setCroppedAreaPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file || !previewUrl || !croppedAreaPixels) return;
    const croppedFile = await getCroppedFile(
      previewUrl,
      croppedAreaPixels,
      file.name.replace(/\.[^.]+$/, '.png'),
    );
    await onConfirm(croppedFile);
  }, [file, previewUrl, croppedAreaPixels, onConfirm]);

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
  }, []);

  // Format file size for display
  const fileSize = useMemo(() => {
    if (!file) return null;
    return file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  }, [file]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isUploading) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>
            Drag to reposition and use the slider to zoom. The circular area will be your profile picture.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Crop area */}
          {previewUrl && (
            <div className="relative w-full aspect-square max-w-[320px] rounded-lg overflow-hidden bg-zinc-950">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                objectFit="contain"
                style={{
                  containerStyle: { borderRadius: '0.5rem' },
                }}
              />
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-3 w-full max-w-[320px]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="flex-1 flex items-center gap-2">
              <ZoomIn className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-indigo-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm"
                aria-label="Zoom level"
              />
            </div>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Reset crop"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Preview + file info */}
          <div className="flex items-center gap-4">
            {/* Circular preview thumbnail */}
            <div className="text-center space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Preview</p>
              <Avatar className="h-16 w-16 border border-zinc-200 dark:border-zinc-700">
                {currentAvatarUrl && <AvatarImage src={currentAvatarUrl} />}
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <p className="text-[10px] text-muted-foreground">Current</p>
            </div>

            {file && (
              <div className="text-center space-y-0.5">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]">
                  {file.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{fileSize}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 sm:flex-initial"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isUploading || !file}
            className="flex-1 sm:flex-initial"
          >
            {isUploading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent inline-block" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
