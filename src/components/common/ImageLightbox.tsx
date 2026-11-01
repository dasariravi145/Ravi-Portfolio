import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export interface LightboxImageItem {
  id?: string;
  url: string;
  altText?: string;
  caption?: string;
  title?: string;
  category?: string;
  componentDescriptions?: string[];
  technologyReferences?: string[];
}

export interface ImageLightboxProps {
  images: LightboxImageItem[];
  currentIndex?: number;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
  triggerElement?: HTMLElement | null;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  currentIndex: controlledIndex,
  initialIndex = 0,
  isOpen,
  onClose,
  onNavigate,
  triggerElement,
}) => {
  const [internalIndex, setInternalIndex] = useState(initialIndex);
  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const currentImage = images[activeIndex] || null;
  const hasMultiple = images.length > 1;

  const handleNavigate = (newIndex: number) => {
    if (controlledIndex === undefined) {
      setInternalIndex(newIndex);
    }
    onNavigate?.(newIndex);
  };

  // Sync internalIndex when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setInternalIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Track previously focused element for focus restoration upon close
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = triggerElement || (document.activeElement as HTMLElement);
      // Lock background scrolling
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Focus the dialog
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);

      return () => {
        document.body.style.overflow = originalOverflow;
        const toFocus = triggerElement || previouslyFocusedElement.current;
        toFocus?.focus?.();
      };
    }
  }, [isOpen, triggerElement]);

  // Reset loading/error state when current image changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [activeIndex]);

  // Keyboard navigation & Focus Trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowRight' && hasMultiple) {
        e.preventDefault();
        handleNavigate((activeIndex + 1) % images.length);
        return;
      }

      if (e.key === 'ArrowLeft' && hasMultiple) {
        e.preventDefault();
        handleNavigate((activeIndex - 1 + images.length) % images.length);
        return;
      }

      // Focus Trap within Modal
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (focusableElements.length > 0) {
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, images.length, hasMultiple, onClose, onNavigate]);

  if (!isOpen || !currentImage) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentImage.title || currentImage.altText || 'Image Lightbox Preview'}
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-3 sm:p-6 outline-none animate-fadeIn motion-reduce:transition-none"
    >
      {/* Backdrop Click Dismiss */}
      <div
        className="absolute inset-0 cursor-pointer"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Main Lightbox Frame */}
      <div className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-floating overflow-hidden border border-slate-200">
        {/* Top Control Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stroke-subtle bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-semibold text-slate-500 font-mono shrink-0">
              {activeIndex + 1} of {images.length}
            </span>
            {currentImage.category && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-brand-primary border border-blue-200 shrink-0">
                {currentImage.category}
              </span>
            )}
            {currentImage.title && (
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {currentImage.title}
              </h3>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors focus-ring shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Image Container */}
        <div className="relative flex-1 min-h-[300px] max-h-[62vh] bg-slate-100 flex items-center justify-center p-4 overflow-hidden select-none">
          {imageLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
              <div className="w-8 h-8 rounded-full border-3 border-brand-primary border-t-transparent animate-spin" />
            </div>
          )}

          {imageError ? (
            <div className="p-8 text-center space-y-2 text-slate-600">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">Image could not be loaded</p>
              <p className="text-xs text-slate-500">The file might be unavailable or removed.</p>
            </div>
          ) : (
            <img
              src={currentImage.url}
              alt={currentImage.altText || currentImage.title || 'Architecture or screenshot visual'}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              className="max-h-full max-w-full object-contain rounded-lg shadow-sm transition-all"
            />
          )}

          {/* Navigation Controls: Previous */}
          {hasMultiple && (
            <button
              type="button"
              onClick={() => handleNavigate((activeIndex - 1 + images.length) % images.length)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-card hover:bg-white hover:scale-105 active:scale-95 transition-all focus-ring"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Navigation Controls: Next */}
          {hasMultiple && (
            <button
              type="button"
              onClick={() => handleNavigate((activeIndex + 1) % images.length)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-card hover:bg-white hover:scale-105 active:scale-95 transition-all focus-ring"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Footer Details: Captions, Component Descriptions & Technologies */}
        {(currentImage.caption ||
          (currentImage.componentDescriptions && currentImage.componentDescriptions.length > 0) ||
          (currentImage.technologyReferences && currentImage.technologyReferences.length > 0)) && (
          <div className="p-4 sm:p-5 bg-white border-t border-stroke-subtle space-y-2 max-h-[22vh] overflow-y-auto">
            {currentImage.caption && (
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {currentImage.caption}
              </p>
            )}

            {currentImage.componentDescriptions && currentImage.componentDescriptions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                  Components:
                </span>
                {currentImage.componentDescriptions.map((comp, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            )}

            {currentImage.technologyReferences && currentImage.technologyReferences.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 pt-1">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                  Tech Stack:
                </span>
                {currentImage.technologyReferences.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 rounded bg-blue-50 text-brand-primary border border-blue-200 font-mono text-[11px]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
