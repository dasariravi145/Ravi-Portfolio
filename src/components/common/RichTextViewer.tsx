import React from 'react';
import { isRichText, sanitizeHtml } from '../../utils/sanitizeHtml';

export interface RichTextViewerProps {
  content?: string | null;
  className?: string;
  as?: 'div' | 'p' | 'span';
  inline?: boolean;
}

export const RichTextViewer: React.FC<RichTextViewerProps> = ({
  content,
  className = '',
  as: Component = 'div',
  inline = false,
}) => {
  if (!content) {
    return null;
  }

  // If content has HTML tags, sanitize and render safely
  if (isRichText(content)) {
    const cleanHtml = sanitizeHtml(content);

    if (inline) {
      return (
        <span
          className={`rich-text-inline ${className}`}
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      );
    }

    return (
      <Component
        className={`rich-text-content ${className}`}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }

  // Legacy plain-text fallback: render text with whitespace preservation if multi-line
  if (inline) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Component className={`${content.includes('\n') ? 'whitespace-pre-line ' : ''}${className}`}>
      {content}
    </Component>
  );
};

