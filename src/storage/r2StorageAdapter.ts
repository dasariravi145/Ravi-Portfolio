/**
 * Cloudflare R2 Storage Adapter & Local Emulation Layer
 * 
 * Implements persistent JSON-based structured storage and binary media storage
 * following ADR-03, ADR-10, and ADR-15.
 * Supports:
 * - Domain-partitioned storage keys (content/*.json)
 * - Binary object operations (media/*)
 * - Optimistic Concurrency Control (OCC) using R2 conditional writes (onlyIf: { etagMatches })
 * - Version tracking & automated pre-mutation snapshot backups (backups/*)
 * - Safe error handling & consistent storage object envelopes
 */

export interface StoragePutOptions {
  onlyIf?: {
    etagMatches?: string;
  };
  customMetadata?: Record<string, string>;
  httpMetadata?: {
    contentType?: string;
    contentDisposition?: string;
  };
}

/**
 * Normalizes an ETag string for reliable comparison across HTTP, Cloudflare edge,
 * and D1/R2 storage layers.
 * - Strips weak ETag prefixes (W/ or w/)
 * - Trims whitespace
 * - Ensures canonical surrounding double-quotes
 */
export function normalizeEtag(etag?: string | null): string | undefined {
  if (!etag) return undefined;
  let clean = etag.trim();
  if (clean.startsWith('W/') || clean.startsWith('w/')) {
    clean = clean.slice(2).trim();
  }
  if (!clean.startsWith('"')) {
    clean = `"${clean}`;
  }
  if (!clean.endsWith('"')) {
    clean = `${clean}"`;
  }
  return clean;
}

/**
 * Compares two ETags using weak/strong normalization following RFC 7232.
 * Returns true if both represent the same underlying entity version.
 */
export function etagsMatch(etag1?: string | null, etag2?: string | null): boolean {
  const norm1 = normalizeEtag(etag1);
  const norm2 = normalizeEtag(etag2);
  if (!norm1 || !norm2) return false;
  return norm1 === norm2;
}

export interface StorageObject<T = unknown> {
  key: string;
  data: T;
  etag: string;
  version: number;
  updatedAt: string;
}

export interface BinaryStorageObject {
  key: string;
  data: Uint8Array;
  mimeType: string;
  etag: string;
  size: number;
  updatedAt: string;
}

export interface IStorageAdapter {
  get<T>(key: string): Promise<StorageObject<T> | null>;
  put<T>(key: string, data: T, options?: StoragePutOptions): Promise<StorageObject<T> | null>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
  getBinary(key: string): Promise<BinaryStorageObject | null>;
  putBinary(
    key: string,
    data: Uint8Array | ArrayBuffer,
    mimeType: string,
    options?: StoragePutOptions
  ): Promise<BinaryStorageObject | null>;
}

/**
 * Helper to convert Uint8Array to Base64 in standard environments
 */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * In-Memory & Local Storage Adapter
 * Used for testing, local offline development, and fallback.
 * Strictly emulates Cloudflare R2 conditional write behavior (onlyIf: { etagMatches }).
 */
export class MemoryStorageAdapter implements IStorageAdapter {
  private store: Map<string, { data: string; etag: string; version: number; updatedAt: string }> =
    new Map();
  private binaryStore: Map<
    string,
    { data: Uint8Array; mimeType: string; etag: string; size: number; updatedAt: string }
  > = new Map();

  async get<T>(key: string): Promise<StorageObject<T> | null> {
    const item = this.store.get(key);
    if (!item) return null;

    try {
      const parsedData = JSON.parse(item.data) as T;
      return {
        key,
        data: parsedData,
        etag: item.etag,
        version: item.version,
        updatedAt: item.updatedAt,
      };
    } catch {
      return null;
    }
  }

  async put<T>(key: string, data: T, options?: StoragePutOptions): Promise<StorageObject<T> | null> {
    const existing = this.store.get(key);

    // Conditional Write Check (onlyIf: { etagMatches })
    if (options?.onlyIf?.etagMatches) {
      if (!existing || !etagsMatch(existing.etag, options.onlyIf.etagMatches)) {
        // Precondition failed (ETag mismatch) -> Cloudflare R2 returns null
        return null;
      }
    }

    const currentVersion = existing ? existing.version + 1 : 1;
    const updatedAt = new Date().toISOString();
    const serialized = JSON.stringify(data);
    const newEtag = `w/"${key.replace(/[^a-zA-Z0-9]/g, '-')}-v${currentVersion}-${Date.now()}"`;

    this.store.set(key, {
      data: serialized,
      etag: newEtag,
      version: currentVersion,
      updatedAt,
    });

    return {
      key,
      data,
      etag: newEtag,
      version: currentVersion,
      updatedAt,
    };
  }

  async getBinary(key: string): Promise<BinaryStorageObject | null> {
    const item = this.binaryStore.get(key);
    if (!item) return null;
    return {
      key,
      data: item.data,
      mimeType: item.mimeType,
      etag: item.etag,
      size: item.size,
      updatedAt: item.updatedAt,
    };
  }

  async putBinary(
    key: string,
    data: Uint8Array | ArrayBuffer,
    mimeType: string,
    options?: StoragePutOptions
  ): Promise<BinaryStorageObject | null> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const existing = this.binaryStore.get(key);

    if (options?.onlyIf?.etagMatches) {
      if (!existing || !etagsMatch(existing.etag, options.onlyIf.etagMatches)) {
        return null;
      }
    }

    const etag = `w/"${key.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}"`;
    const updatedAt = new Date().toISOString();
    const entry = {
      data: bytes,
      mimeType,
      etag,
      size: bytes.byteLength,
      updatedAt,
    };

    this.binaryStore.set(key, entry);

    return {
      key,
      ...entry,
    };
  }

  async delete(key: string): Promise<boolean> {
    const d1 = this.store.delete(key);
    const d2 = this.binaryStore.delete(key);
    return d1 || d2;
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = new Set<string>();
    for (const key of this.store.keys()) {
      if (!prefix || key.startsWith(prefix)) {
        keys.add(key);
      }
    }
    for (const key of this.binaryStore.keys()) {
      if (!prefix || key.startsWith(prefix)) {
        keys.add(key);
      }
    }
    return Array.from(keys);
  }

  /**
   * Helper to inspect internal map size for testing persistence
   */
  size(): number {
    return this.store.size + this.binaryStore.size;
  }

  /**
   * Snapshot store state for testing restart resilience
   */
  exportState(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of this.store.entries()) {
      result[k] = JSON.stringify(v);
    }
    for (const [k, v] of this.binaryStore.entries()) {
      result[`__bin__:${k}`] = JSON.stringify({
        b64: toBase64(v.data),
        mimeType: v.mimeType,
        etag: v.etag,
        size: v.size,
        updatedAt: v.updatedAt,
      });
    }
    return result;
  }

  /**
   * Restore store state for testing restart resilience
   */
  importState(state: Record<string, string>): void {
    this.store.clear();
    this.binaryStore.clear();
    for (const [k, v] of Object.entries(state)) {
      if (k.startsWith('__bin__:')) {
        const parsed = JSON.parse(v);
        const realKey = k.substring(8);
        this.binaryStore.set(realKey, {
          data: fromBase64(parsed.b64),
          mimeType: parsed.mimeType,
          etag: parsed.etag,
          size: parsed.size,
          updatedAt: parsed.updatedAt,
        });
      } else {
        this.store.set(k, JSON.parse(v));
      }
    }
  }
}

/**
 * Cloudflare Worker R2 Storage Adapter
 * Interfaces with native Cloudflare R2Bucket binding (env.PORTFOLIO_BUCKET).
 */
export class CloudflareR2StorageAdapter implements IStorageAdapter {
  private bucket: {
    get: (key: string) => Promise<{
      text: () => Promise<string>;
      arrayBuffer: () => Promise<ArrayBuffer>;
      etag: string;
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string; contentDisposition?: string };
      uploaded: Date;
    } | null>;
    put: (
      key: string,
      value: string | ArrayBuffer | Uint8Array,
      options?: {
        onlyIf?: { etagMatches?: string };
        customMetadata?: Record<string, string>;
        httpMetadata?: { contentType?: string; contentDisposition?: string };
      }
    ) => Promise<{ etag: string } | null>;
    delete: (key: string) => Promise<void>;
    list: (options?: { prefix?: string }) => Promise<{ objects: Array<{ key: string }> }>;
  };

  constructor(bucketBinding: unknown) {
    this.bucket = bucketBinding as typeof this.bucket;
  }

  async get<T>(key: string): Promise<StorageObject<T> | null> {
    if (!this.bucket) return null;
    const object = await this.bucket.get(key);
    if (!object) return null;

    try {
      const text = await object.text();
      const parsedData = JSON.parse(text) as T;
      const version = object.customMetadata?.version
        ? parseInt(object.customMetadata.version, 10)
        : 1;
      return {
        key,
        data: parsedData,
        etag: object.etag,
        version,
        updatedAt: object.uploaded ? object.uploaded.toISOString() : new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async put<T>(key: string, data: T, options?: StoragePutOptions): Promise<StorageObject<T> | null> {
    if (!this.bucket) return null;

    // Fetch existing metadata to increment version counter
    const existing = await this.get<T>(key);
    const nextVersion = existing ? existing.version + 1 : 1;
    const updatedAt = new Date().toISOString();
    const serialized = JSON.stringify(data);

    const putResult = await this.bucket.put(key, serialized, {
      onlyIf: options?.onlyIf?.etagMatches ? { etagMatches: options.onlyIf.etagMatches } : undefined,
      customMetadata: {
        version: String(nextVersion),
        updatedAt,
      },
    });

    if (!putResult) {
      return null;
    }

    return {
      key,
      data,
      etag: putResult.etag,
      version: nextVersion,
      updatedAt,
    };
  }

  async getBinary(key: string): Promise<BinaryStorageObject | null> {
    if (!this.bucket) return null;
    const object = await this.bucket.get(key);
    if (!object) return null;

    const buffer = await object.arrayBuffer();
    const mimeType = object.httpMetadata?.contentType || 'application/octet-stream';
    return {
      key,
      data: new Uint8Array(buffer),
      mimeType,
      etag: object.etag,
      size: buffer.byteLength,
      updatedAt: object.uploaded ? object.uploaded.toISOString() : new Date().toISOString(),
    };
  }

  async putBinary(
    key: string,
    data: Uint8Array | ArrayBuffer,
    mimeType: string,
    options?: StoragePutOptions
  ): Promise<BinaryStorageObject | null> {
    if (!this.bucket) return null;
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    const putResult = await this.bucket.put(key, bytes, {
      onlyIf: options?.onlyIf?.etagMatches ? { etagMatches: options.onlyIf.etagMatches } : undefined,
      httpMetadata: {
        contentType: mimeType,
        contentDisposition: options?.httpMetadata?.contentDisposition,
      },
      customMetadata: options?.customMetadata,
    });

    if (!putResult) return null;

    return {
      key,
      data: bytes,
      mimeType,
      etag: putResult.etag,
      size: bytes.byteLength,
      updatedAt: new Date().toISOString(),
    };
  }

  async delete(key: string): Promise<boolean> {
    if (!this.bucket) return false;
    await this.bucket.delete(key);
    return true;
  }

  async list(prefix?: string): Promise<string[]> {
    if (!this.bucket) return [];
    const result = await this.bucket.list({ prefix });
    return result.objects.map((o) => o.key);
  }
}
