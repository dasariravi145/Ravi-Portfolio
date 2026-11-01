import React, { useState } from 'react';
import { MediaAsset } from '../../types/portfolio';
import { ImageLightbox, LightboxImageItem } from '../common/ImageLightbox';
import { Maximize2 } from 'lucide-react';

export interface ScreenshotGalleryProps {
  screenshots: MediaAsset[];
  projectTitle: string;
}

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({
  screenshots,
  projectTitle,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!screenshots || screenshots.length === 0) {
    return null;
  }

  const lightboxItems: LightboxImageItem[] = screenshots.map((s, idx) => ({
    id: s.id || `shot-${idx}`,
    url: s.url,
    altText: s.altText || `${projectTitle} Screenshot ${idx + 1}`,
    caption: s.caption || s.altText,
    title: `${projectTitle} — Screenshot ${idx + 1}`,
  }));

  const handleOpenLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {screenshots.map((shot, index) => (
          <div
            key={shot.id || index}
            className="rounded-xl overflow-hidden border border-stroke-subtle bg-white shadow-xs group relative cursor-pointer transition-all hover:shadow-card hover:-translate-y-0.5"
            onClick={() => handleOpenLightbox(index)}
          >
            <div className="h-44 sm:h-48 overflow-hidden bg-slate-100 flex items-center justify-center">
              <img
                src={shot.url}
                alt={shot.altText || `${projectTitle} Screenshot ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                loading="lazy"
              />
            </div>

            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                aria-label={`View full resolution screenshot ${index + 1}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-slate-900 font-semibold text-xs shadow-md focus-ring"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Enlarge</span>
              </button>
            </div>

            {shot.caption && (
              <div className="p-3 bg-white border-t border-stroke-subtle text-xs text-slate-600 line-clamp-2">
                {shot.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Accessible Lightbox */}
      <ImageLightbox
        images={lightboxItems}
        currentIndex={activeIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => setActiveIndex(newIdx)}
      />
    </div>
  );
};

