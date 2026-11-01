/**
 * Media Validator & Binary File Security Engine
 * 
 * Enforces strict MIME, Magic Byte, and size boundaries according to Prompt 08:
 * - Profile photo: JPEG, PNG, WebP <= 5 MB
 * - Resume document: Strictly PDF <= 10 MB
 * - Prevents executable uploads, SVG script injections, and path traversals
 */

export const MEDIA_LIMITS = {
  PROFILE_PHOTO_MAX_BYTES: 5 * 1024 * 1024, // 5 MB
  RESUME_PDF_MAX_BYTES: 10 * 1024 * 1024,    // 10 MB
} as const;

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
}

/**
 * Validates binary buffer magic bytes against declared MIME type
 */
export function validateMagicBytes(
  buffer: ArrayBuffer | Uint8Array,
  declaredMime: string
): FileValidationResult {
  const bytes = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer as any);

  if (bytes.length < 4) {
    return { valid: false, error: 'File is empty or too small to be a valid media asset.' };
  }

  // Reject executable binaries (Windows MZ or Linux ELF)
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
    return { valid: false, error: 'Executable binaries (.exe/.dll) are strictly prohibited.' };
  }
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
    return { valid: false, error: 'Executable binaries (ELF) are strictly prohibited.' };
  }

  // PDF Validation (%PDF -> 0x25, 0x50, 0x44, 0x46)
  if (declaredMime === 'application/pdf') {
    const isPdf =
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46;

    if (!isPdf) {
      return {
        valid: false,
        error: 'File signature does not match valid PDF (%PDF) structure.',
      };
    }
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // PNG Validation (0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
  if (declaredMime === 'image/png') {
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;

    if (!isPng) {
      return {
        valid: false,
        error: 'File signature does not match valid PNG structure.',
      };
    }
    return { valid: true, detectedMime: 'image/png' };
  }

  // JPEG Validation (0xFF, 0xD8, 0xFF)
  if (declaredMime === 'image/jpeg') {
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isJpeg) {
      return {
        valid: false,
        error: 'File signature does not match valid JPEG structure.',
      };
    }
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // WebP Validation (RIFF....WEBP -> 0x52, 0x49, 0x46, 0x46 ... 0x57, 0x45, 0x42, 0x50)
  if (declaredMime === 'image/webp') {
    const isRiff =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;
    const isWebp =
      bytes.length >= 12 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    if (!isRiff || !isWebp) {
      return {
        valid: false,
        error: 'File signature does not match valid WebP (RIFF/WEBP) structure.',
      };
    }
    return { valid: true, detectedMime: 'image/webp' };
  }

  return {
    valid: false,
    error: `Unsupported declared MIME type: "${declaredMime}". Allowed: image/jpeg, image/png, image/webp, application/pdf.`,
  };
}

/**
 * Validates a profile photo binary payload
 */
export function validateProfilePhoto(
  buffer: ArrayBuffer | Uint8Array,
  declaredMime: string,
  filename?: string
): FileValidationResult {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (bytes.length > MEDIA_LIMITS.PROFILE_PHOTO_MAX_BYTES) {
    return {
      valid: false,
      error: `Profile photo exceeds maximum limit of 5 MB (Received ${(bytes.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  if (!ALLOWED_IMAGE_MIMES.includes(declaredMime as any)) {
    return {
      valid: false,
      error: `Invalid photo format "${declaredMime}". Only JPEG, PNG, and WebP images are allowed.`,
    };
  }

  // Check filename extension if provided
  if (filename) {
    const clean = filename.toLowerCase();
    const hasValidExt =
      clean.endsWith('.jpg') ||
      clean.endsWith('.jpeg') ||
      clean.endsWith('.png') ||
      clean.endsWith('.webp');
    if (!hasValidExt) {
      return {
        valid: false,
        error: 'Filename extension does not match allowed image formats (.jpg, .jpeg, .png, .webp).',
      };
    }
  }

  return validateMagicBytes(bytes, declaredMime);
}

/**
 * Validates a resume PDF binary payload
 */
export function validateResumePdf(
  buffer: ArrayBuffer | Uint8Array,
  declaredMime: string,
  filename?: string
): FileValidationResult {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (bytes.length > MEDIA_LIMITS.RESUME_PDF_MAX_BYTES) {
    return {
      valid: false,
      error: `Resume PDF exceeds maximum limit of 10 MB (Received ${(bytes.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  if (declaredMime !== 'application/pdf') {
    return {
      valid: false,
      error: `Invalid resume format "${declaredMime}". Resumes must strictly be in PDF format.`,
    };
  }

  if (filename && !filename.toLowerCase().endsWith('.pdf')) {
    return {
      valid: false,
      error: 'Resume filename must end with .pdf.',
    };
  }

  return validateMagicBytes(bytes, 'application/pdf');
}

/**
 * Generates an immutable, cache-safe R2 object key for profile avatars
 */
export function generateAvatarKey(extension: string): string {
  const cleanExt = extension.replace(/^\./, '').toLowerCase() || 'webp';
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  return `media/avatars/avatar-${id}-${timestamp}.${cleanExt}`;
}

/**
 * Generates active resume R2 object key
 */
export function getActiveResumeKey(): string {
  return 'media/resume/active/Ravi_Dasari_Resume.pdf';
}

/**
 * Generates archived resume R2 object key for audit trails
 */
export function generateArchivedResumeKey(versionTag = 'v1'): string {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `media/resume/archive/resume-${timestamp}-${versionTag}-${id}.pdf`;
}
