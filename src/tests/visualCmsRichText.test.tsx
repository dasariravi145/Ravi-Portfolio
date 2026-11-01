import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { sanitizeHtml, isRichText, stripHtml } from '../utils/sanitizeHtml';
import { RichTextViewer } from '../components/common/RichTextViewer';
import { RichTextEditor } from '../components/common/RichTextEditor';

describe('Website-Wide Visual CMS & Rich Text Architecture', () => {
  describe('1. HTML Sanitization & XSS Prevention (Phase 6 Security)', () => {
    it('should sanitize dangerous script tags and inline event handlers', () => {
      const maliciousHtml = '<p>Safe Text</p><script>alert("pwned")</script><img src="x" onerror="alert(1)" />';
      const sanitized = sanitizeHtml(maliciousHtml);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('<p>Safe Text</p>');
    });

    it('should strip dangerous URI schemes like javascript: and data:', () => {
      const dangerousLink = '<a href="javascript:alert(1)">Click Me</a>';
      const sanitized = sanitizeHtml(dangerousLink);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('rel="noopener noreferrer"');
    });

    it('should enforce rel="noopener noreferrer" and target="_blank" on external links', () => {
      const externalLink = '<a href="https://example.com/docs">External Resource</a>';
      const sanitized = sanitizeHtml(externalLink);

      expect(sanitized).toContain('rel="noopener noreferrer"');
      expect(sanitized).toContain('target="_blank"');
      expect(sanitized).toContain('href="https://example.com/docs"');
    });

    it('should permit approved brand styles (color, font-size, text-align, line-height)', () => {
      const styledContent =
        '<p style="color: #2563EB; font-size: 18px; text-align: center; line-height: 1.7; behavior: url(x);">Styled Paragraph</p>';
      const sanitized = sanitizeHtml(styledContent);

      expect(sanitized).toContain('color: #2563EB');
      expect(sanitized).toContain('font-size: 18px');
      expect(sanitized).toContain('text-align: center');
      expect(sanitized).toContain('line-height: 1.7');
      expect(sanitized).not.toContain('behavior');
    });

    it('should strip all HTML tags when stripHtml is called', () => {
      const richHtml = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> &amp; <em>italic</em> text.</p>';
      const plain = stripHtml(richHtml);

      expect(plain).toBe('TitleParagraph with bold & italic text.');
    });

    it('should correctly identify rich text vs plain text', () => {
      expect(isRichText('<p>Rich content</p>')).toBe(true);
      expect(isRichText('<strong>Emphasized</strong>')).toBe(true);
      expect(isRichText('<span style="color: blue;">Blue</span>')).toBe(true);
      expect(isRichText('Just normal plain text string')).toBe(false);
      expect(isRichText('')).toBe(false);
      expect(isRichText(null)).toBe(false);
      expect(isRichText(undefined)).toBe(false);
    });
  });

  describe('2. RichTextViewer Component Rendering & Backwards Compatibility', () => {
    it('should render legacy plain text backwards-compatibly without modifying structure', () => {
      const plainText = 'DevOps Engineer with 6.6 years of IT experience.';
      const { container } = render(<RichTextViewer content={plainText} />);

      expect(container.textContent).toBe(plainText);
      expect(container.querySelector('.rich-text-content')).toBeNull();
    });

    it('should preserve line breaks in multi-line plain text strings', () => {
      const multiLineText = 'Line 1\nLine 2\nLine 3';
      const { container } = render(<RichTextViewer content={multiLineText} />);

      const wrapper = container.querySelector('div');
      expect(wrapper).toHaveClass('whitespace-pre-line');
      expect(container.textContent).toBe(multiLineText);
    });

    it('should render sanitized rich text with .rich-text-content typography class', () => {
      const richText = '<p>Architecting <strong style="color: #2563EB;">Cloud Systems</strong> with zero downtime.</p>';
      const { container } = render(<RichTextViewer content={richText} />);

      const richWrapper = container.querySelector('.rich-text-content');
      expect(richWrapper).not.toBeNull();
      expect(container.innerHTML).toContain('color: #2563EB');
      expect(container.querySelector('strong')?.textContent).toBe('Cloud Systems');
    });

    it('should render inline rich text cleanly when inline={true}', () => {
      const inlineRichText = 'Building Reliable <span style="color: #0D9488;">Kubernetes</span> Platforms';
      const { container } = render(<RichTextViewer content={inlineRichText} inline as="span" />);

      const spanWrapper = container.querySelector('.rich-text-inline');
      expect(spanWrapper).not.toBeNull();
      expect(container.innerHTML).toContain('color: #0D9488');
      expect(container.textContent).toBe('Building Reliable Kubernetes Platforms');
    });

    it('should return null when content is empty or null', () => {
      const { container: c1 } = render(<RichTextViewer content="" />);
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(<RichTextViewer content={null} />);
      expect(c2.firstChild).toBeNull();
    });
  });

  describe('3. RichTextEditor Component (Phase 2 & Phase 4)', () => {
    it('should render interactive editor with brand toolbars and initial value', () => {
      const handleChange = vi.fn();
      render(
        <RichTextEditor
          label="Professional Overview"
          value="<p>Initial engineering summary</p>"
          onChange={handleChange}
        />
      );

      expect(screen.getByText('Professional Overview')).toBeInTheDocument();
      expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
      expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument();
      expect(screen.getByTitle('Underline (Ctrl+U)')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 3')).toBeInTheDocument();
      expect(screen.getByTitle('Align Left')).toBeInTheDocument();
      expect(screen.getByTitle('Align Center')).toBeInTheDocument();
      expect(screen.getByTitle('Align Right')).toBeInTheDocument();
      expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
      expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
      expect(screen.getByTitle('Select Brand Text Color')).toBeInTheDocument();
    });

    it('should display unsaved changes badge when value differs from initial', () => {
      const handleChange = vi.fn();
      render(
        <RichTextEditor
          label="Hero Title"
          value="<p>Modified Title</p>"
          initialValue="<p>Original Title</p>"
          onChange={handleChange}
        />
      );

      expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    });

    it('should support switching between Editor, Desktop Preview, and Mobile Preview', async () => {
      const handleChange = vi.fn();
      render(
        <RichTextEditor
          label="Biography"
          value="<p>Tested Mobile Responsive Biography</p>"
          onChange={handleChange}
        />
      );

      // Default tab is Editor
      expect(screen.getByTitle('Interactive Visual Editor')).toBeInTheDocument();

      // Switch to Desktop preview
      const desktopBtn = screen.getByTitle('Desktop Preview');
      fireEvent.click(desktopBtn);
      expect(screen.getByText('Public Desktop Preview Simulation')).toBeInTheDocument();
      expect(screen.getByText('Tested Mobile Responsive Biography')).toBeInTheDocument();

      // Switch to Mobile preview (390px)
      const mobileBtn = screen.getByTitle('Mobile Preview (390px)');
      fireEvent.click(mobileBtn);
      expect(screen.getByText('Mobile Screen (390px)')).toBeInTheDocument();
      expect(screen.getByText('AA Accessible')).toBeInTheDocument();
      expect(screen.getByText('Tested Mobile Responsive Biography')).toBeInTheDocument();
    });

    it('should revert uncommitted edits when clicking the Revert button', () => {
      const handleChange = vi.fn();
      const handleCancel = vi.fn();
      render(
        <RichTextEditor
          label="Biography"
          value="<p>Changed text</p>"
          initialValue="<p>Original pristine text</p>"
          onChange={handleChange}
          onCancel={handleCancel}
        />
      );

      const revertBtn = screen.getByTitle('Discard uncommitted changes');
      expect(revertBtn).toBeInTheDocument();

      fireEvent.click(revertBtn);
      expect(handleChange).toHaveBeenCalledWith('<p>Original pristine text</p>');
      expect(handleCancel).toHaveBeenCalled();
    });

    it('should open brand color palette with approved colors', () => {
      const handleChange = vi.fn();
      render(
        <RichTextEditor
          label="Styled Text"
          value="<p>Content</p>"
          onChange={handleChange}
        />
      );

      const colorBtn = screen.getByTitle('Select Brand Text Color');
      fireEvent.click(colorBtn);

      expect(screen.getByText('Approved Brand Palette')).toBeInTheDocument();
      expect(screen.getByText('Royal Blue (Brand)')).toBeInTheDocument();
      expect(screen.getByText('Emerald Teal')).toBeInTheDocument();
      expect(screen.getByText('Sky Blue')).toBeInTheDocument();
      expect(screen.getByText('Dark Slate')).toBeInTheDocument();
    });
  });
});
