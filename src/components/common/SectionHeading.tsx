import React from 'react';
import { RichTextViewer } from './RichTextViewer';

export interface SectionHeadingProps {
  badge?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  badge,
  title,
  subtitle,
  align = 'center',
  className = '',
}) => {
  const alignment = align === 'center' ? 'text-center mx-auto' : 'text-left';

  return (
    <div className={`max-w-3xl mb-12 md:mb-16 ${alignment} ${className}`}>
      {badge && (
        <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-wider text-brand-primary uppercase rounded-full bg-brand-primary/10 border border-brand-primary/20">
          {badge}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
        {typeof title === 'string' ? <RichTextViewer content={title} as="span" /> : title}
      </h2>
      {subtitle && (
        <div className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
          {typeof subtitle === 'string' ? <RichTextViewer content={subtitle} as="p" /> : subtitle}
        </div>
      )}
    </div>
  );
};
