import React, { useState } from 'react';
import { ArchitectureDiagram } from '../../types/portfolio';
import { Card } from '../common/Card';
import { ImageLightbox, LightboxImageItem } from '../common/ImageLightbox';
import {
  Layers,
  Cloud,
  GitBranch,
  Server,
  ShieldCheck,
  Workflow,
  Cpu,
  Boxes,
  Maximize2,
  FolderOpen,
} from 'lucide-react';

export interface ArchitectureGalleryProps {
  diagrams: ArchitectureDiagram[];
  projectTitle?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'System Architecture': <Layers className="w-4 h-4 text-blue-600" />,
  'Cloud Infrastructure': <Cloud className="w-4 h-4 text-sky-600" />,
  'CI/CD Pipeline': <GitBranch className="w-4 h-4 text-teal-600" />,
  'Deployment Architecture': <Server className="w-4 h-4 text-indigo-600" />,
  'Security Architecture': <ShieldCheck className="w-4 h-4 text-emerald-600" />,
  'Data Flow': <Workflow className="w-4 h-4 text-cyan-600" />,
  'AI Workflow': <Cpu className="w-4 h-4 text-violet-600" />,
  'Application Architecture': <Boxes className="w-4 h-4 text-blue-700" />,
};

export const ArchitectureGallery: React.FC<ArchitectureGalleryProps> = ({
  diagrams = [],
  projectTitle = 'Project',
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter published diagrams only (public invariant)
  const publishedDiagrams = diagrams.filter((d) => d.published !== false);

  if (publishedDiagrams.length === 0) {
    return (
      <div className="p-8 sm:p-10 rounded-2xl border-2 border-dashed border-stroke-subtle bg-slate-50/60 text-center space-y-3">
        <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">
          Architecture Diagrams in Verification
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Detailed architecture topologies for {projectTitle} will be published once internal security review and sanitization are complete.
        </p>
      </div>
    );
  }

  const lightboxItems: LightboxImageItem[] = publishedDiagrams.map((d) => ({
    id: d.id,
    url: d.image.url,
    altText: d.image.altText || d.title,
    caption: d.description,
    title: d.title,
    category: d.category,
    componentDescriptions: (d.components && d.components.length > 0) ? d.components : d.componentDescriptions,
    technologyReferences: (d.technologies && d.technologies.length > 0) ? d.technologies : d.technologyReferences,
  }));

  const handleOpenLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {publishedDiagrams.map((diagram, index) => {
          const icon = CATEGORY_ICONS[diagram.category] || <Layers className="w-4 h-4 text-blue-600" />;
          const components = (diagram.components && diagram.components.length > 0)
            ? diagram.components
            : (diagram.componentDescriptions || []);
          const technologies = (diagram.technologies && diagram.technologies.length > 0)
            ? diagram.technologies
            : (diagram.technologyReferences || []);

          return (
            <Card
              key={diagram.id || index}
              padding="none"
              hoverable
              className="overflow-hidden flex flex-col justify-between border-stroke-subtle bg-white shadow-subtle group"
            >
              <div>
                {/* Diagram Image Container */}
                <div
                  className="relative h-56 sm:h-64 bg-slate-100 flex items-center justify-center p-3 overflow-hidden cursor-pointer"
                  onClick={() => handleOpenLightbox(index)}
                >
                  <img
                    src={diagram.image.url}
                    alt={diagram.image.altText || diagram.title}
                    className="max-h-full max-w-full object-contain group-hover:scale-102 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      aria-label={`Zoom ${diagram.title}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-900 font-semibold text-xs shadow-md focus-ring"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Enlarge Diagram</span>
                    </button>
                  </div>
                </div>

                {/* Card Header & Description */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-slate-100">{icon}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-brand-primary border border-blue-200">
                      {diagram.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {diagram.title}
                  </h3>

                  {diagram.description && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {diagram.description}
                    </p>
                  )}

                  {/* Component Descriptions / Components */}
                  {components && components.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Components:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                        {components.slice(0, 4).map((comp, idx) => (
                          <li key={idx} className="truncate">{comp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Technologies Row */}
              {technologies && technologies.length > 0 && (
                <div className="px-5 py-3 bg-slate-50 border-t border-stroke-subtle flex flex-wrap gap-1.5">
                  {technologies.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-white text-slate-700 border border-slate-200 shadow-2xs"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Accessible Lightbox Modal */}
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
