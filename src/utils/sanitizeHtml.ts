import DOMPurify from 'dompurify';

/**
 * Permitted HTML tags for safe rich-text rendering
 */
const ALLOWED_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'span',
  'a',
  'ul',
  'ol',
  'li',
  'br',
  'blockquote',
  'code',
  'pre',
  'hr',
];

/**
 * Permitted HTML attributes
 */
const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'style',
  'class',
  'title',
  'aria-label',
];

/**
 * Permitted CSS styles in inline style attribute
 */
const ALLOWED_STYLES = [
  'color',
  'font-size',
  'text-align',
  'line-height',
  'margin',
  'margin-top',
  'margin-bottom',
  'padding',
  'font-weight',
  'text-decoration',
];

// Configure DOMPurify hooks to enforce safe attributes and safe URLs
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    // Force rel="noopener noreferrer" for security
    node.setAttribute('rel', 'noopener noreferrer');

    const href = node.getAttribute('href') || '';
    const trimmed = href.trim().toLowerCase();

    // Block dangerous protocols like javascript:, data:, vbscript:
    if (
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('vbscript:') ||
      trimmed.startsWith('file:')
    ) {
      node.removeAttribute('href');
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      node.setAttribute('target', '_blank');
    }
  }

  // Sanitize inline styles if present
  if (node.hasAttribute('style')) {
    const rawStyle = node.getAttribute('style') || '';
    const declarations = rawStyle.split(';').map((s) => s.trim()).filter(Boolean);
    const safeDeclarations: string[] = [];

    for (const decl of declarations) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim().toLowerCase();
      const val = decl.slice(colonIdx + 1).trim();

      // Only allow approved CSS properties and disallow expression(), url(), or behavior
      if (
        ALLOWED_STYLES.includes(prop) &&
        !val.toLowerCase().includes('expression') &&
        !val.toLowerCase().includes('url(') &&
        !val.toLowerCase().includes('behavior')
      ) {
        safeDeclarations.push(`${prop}: ${val}`);
      }
    }

    if (safeDeclarations.length > 0) {
      node.setAttribute('style', safeDeclarations.join('; '));
    } else {
      node.removeAttribute('style');
    }
  }
});

/**
 * Sanitizes rich HTML string, stripping scripts, dangerous attributes, and invalid styling.
 */
export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    RETURN_TRUSTED_TYPE: false,
  });
}

/**
 * Checks if a string contains HTML tags, indicating rich text formatted content.
 */
export function isRichText(content?: string | null): boolean {
  if (!content || typeof content !== 'string') return false;
  // Look for HTML opening or closing tags like <p>, <strong>, <span style=...>, <a href=...>
  return /<\s*([a-z1-6]+)(?:\s+[^>]*>|>)/i.test(content);
}

/**
 * Strips all HTML tags and returns plain text.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
