import { IStorageAdapter } from '../storage/r2StorageAdapter';
import {
  WebAuthnCredentialsStore,
  StoredChallenge,
  EnrolledPasskey,
  HashedRecoveryCode,
} from './webauthnTypes';

const CREDENTIALS_KEY = 'auth/admin_credentials.json';
const CHALLENGE_PREFIX = 'auth/challenges/';

export class WebAuthnStore {
  constructor(private adapter: IStorageAdapter) {}

  /**
   * Hashes a recovery code with SHA-256
   */
  static async hashRecoveryCode(code: string): Promise<string> {
    const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(normalized));
    const bytes = new Uint8Array(digest);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generates 5 cryptographically secure random recovery codes (RD-XXXX-XXXX-XXXX)
   */
  static generateRecoveryCodes(): { plainCodes: string[] } {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without ambiguous chars
    const plainCodes: string[] = [];

    for (let i = 0; i < 5; i++) {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      let segment = '';
      for (let j = 0; j < 12; j++) {
        segment += chars[bytes[j] % chars.length];
      }
      const formatted = `RD-${segment.slice(0, 4)}-${segment.slice(4, 8)}-${segment.slice(8, 12)}`;
      plainCodes.push(formatted);
    }

    return { plainCodes };
  }

  /**
   * Generates and hashes 5 recovery codes
   */
  static async generateRecoveryCodesWithHashes(): Promise<{
    plainCodes: string[];
    hashedCodes: HashedRecoveryCode[];
  }> {
    const { plainCodes } = WebAuthnStore.generateRecoveryCodes();
    const hashedCodes = await Promise.all(
      plainCodes.map(async (code) => ({
        codeHash: await WebAuthnStore.hashRecoveryCode(code),
        used: false,
      }))
    );
    return { plainCodes, hashedCodes };
  }

  /**
   * Retrieves the credentials store
   */
  async getCredentialsStore(): Promise<WebAuthnCredentialsStore | null> {
    const obj = await this.adapter.get<WebAuthnCredentialsStore>(CREDENTIALS_KEY);
    if (!obj) return null;
    return obj.data;
  }

  /**
   * Saves credentials store atomically
   */
  async saveCredentialsStore(data: WebAuthnCredentialsStore): Promise<void> {
    data.updatedAt = new Date().toISOString();
    await this.adapter.put<WebAuthnCredentialsStore>(CREDENTIALS_KEY, data, {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        enrolled: data.enrolled ? 'true' : 'false',
        credentialsCount: data.credentials.length.toString(),
      },
    });
  }

  /**
   * Stores a challenge with a 2-minute expiration
   */
  async saveChallenge(
    challengeId: string,
    challenge: string,
    purpose: StoredChallenge['purpose'],
    userEmail: string,
    ttlSeconds: number = 120
  ): Promise<void> {
    const now = Date.now();
    const data: StoredChallenge = {
      challenge,
      purpose,
      userEmail,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    };

    const key = `${CHALLENGE_PREFIX}${challengeId}.json`;
    await this.adapter.put<StoredChallenge>(key, data, {
      httpMetadata: {
        contentType: 'application/json',
      },
    });
  }

  /**
   * Consumes a challenge atomically: reads and deletes it so it cannot be reused
   */
  async consumeChallenge(challengeId: string): Promise<StoredChallenge | null> {
    const key = `${CHALLENGE_PREFIX}${challengeId}.json`;
    const obj = await this.adapter.get<StoredChallenge>(key);
    if (!obj) return null;

    // Immediately delete to enforce strictly single-use
    await this.adapter.delete(key);

    const parsed = obj.data;
    if (parsed.expiresAt < Date.now()) {
      return null; // Expired
    }
    return parsed;
  }

  /**
   * Enrolls initial owner passkey and burns setup state
   */
  async enrollInitialOwner(
    ownerEmail: string,
    rpId: string,
    origin: string,
    initialPasskey: EnrolledPasskey,
    hashedCodes: HashedRecoveryCode[]
  ): Promise<void> {
    const existing = await this.getCredentialsStore();
    if (existing && existing.enrolled) {
      throw new Error('Authentication is already initialized. Public registration is prohibited.');
    }

    const storeData: WebAuthnCredentialsStore = {
      schemaVersion: 1,
      enrolled: true,
      ownerEmail,
      rpId,
      origin,
      credentials: [initialPasskey],
      recoveryCodes: hashedCodes,
      revokedSessionIds: [],
      updatedAt: new Date().toISOString(),
    };

    await this.saveCredentialsStore(storeData);
  }

  /**
   * Adds a secondary / backup passkey
   */
  async addBackupPasskey(newPasskey: EnrolledPasskey): Promise<void> {
    const store = await this.getCredentialsStore();
    if (!store || !store.enrolled) {
      throw new Error('Admin authentication has not been initialized.');
    }

    // Verify credential ID is not duplicate
    if (store.credentials.some((c) => c.id === newPasskey.id)) {
      throw new Error('Passkey with this ID is already enrolled.');
    }

    store.credentials.push(newPasskey);
    await this.saveCredentialsStore(store);
  }

  /**
   * Removes an enrolled passkey (must retain at least 1)
   */
  async removePasskey(credentialId: string): Promise<void> {
    const store = await this.getCredentialsStore();
    if (!store || !store.enrolled) {
      throw new Error('Admin authentication has not been initialized.');
    }

    if (store.credentials.length <= 1) {
      throw new Error('Cannot remove the only enrolled passkey. Add a backup passkey first.');
    }

    store.credentials = store.credentials.filter((c) => c.id !== credentialId);
    await this.saveCredentialsStore(store);
  }

  /**
   * Updates an existing credential sign counter
   */
  async updateCredentialCounter(credentialId: string, newCounter: number): Promise<void> {
    const store = await this.getCredentialsStore();
    if (!store) return;

    const cred = store.credentials.find((c) => c.id === credentialId);
    if (cred) {
      cred.counter = newCounter;
      cred.lastUsedAt = new Date().toISOString();
      await this.saveCredentialsStore(store);
    }
  }

  /**
   * Verifies and burns a recovery code atomically with optimistic concurrency control (OCC)
   */
  async consumeRecoveryCode(code: string): Promise<{ success: boolean; remaining: number }> {
    const storeObj = await this.adapter.get<WebAuthnCredentialsStore>(CREDENTIALS_KEY);
    if (!storeObj || !storeObj.data.enrolled) {
      return { success: false, remaining: 0 };
    }

    const store = storeObj.data;
    const hash = await WebAuthnStore.hashRecoveryCode(code);
    const codeEntry = store.recoveryCodes.find((c) => c.codeHash === hash);

    if (!codeEntry || codeEntry.used) {
      return {
        success: false,
        remaining: store.recoveryCodes.filter((c) => !c.used).length,
      };
    }

    // Burn code atomically
    codeEntry.used = true;
    codeEntry.usedAt = new Date().toISOString();
    store.updatedAt = new Date().toISOString();

    // Conditional write using OCC / ETag match to prevent concurrent redemption
    const putResult = await this.adapter.put<WebAuthnCredentialsStore>(CREDENTIALS_KEY, store, {
      onlyIf: { etagMatches: storeObj.etag },
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        enrolled: 'true',
        credentialsCount: store.credentials.length.toString(),
      },
    });

    if (!putResult) {
      // Concurrency conflict: another request committed a write concurrently!
      const updatedStore = await this.getCredentialsStore();
      const remaining = updatedStore?.recoveryCodes.filter((c) => !c.used).length ?? 0;
      return { success: false, remaining };
    }

    const remaining = store.recoveryCodes.filter((c) => !c.used).length;
    return { success: true, remaining };
  }

  /**
   * Replaces recovery codes (must be authenticated)
   */
  async replaceRecoveryCodes(newHashedCodes: HashedRecoveryCode[]): Promise<void> {
    const store = await this.getCredentialsStore();
    if (!store || !store.enrolled) {
      throw new Error('Admin authentication has not been initialized.');
    }

    store.recoveryCodes = newHashedCodes;
    await this.saveCredentialsStore(store);
  }

  /**
   * Revokes a session ID
   */
  async revokeSession(sessionId: string): Promise<void> {
    let store = await this.getCredentialsStore();
    if (!store) {
      store = {
        schemaVersion: 1,
        enrolled: false,
        ownerEmail: '',
        rpId: '',
        origin: '',
        credentials: [],
        recoveryCodes: [],
        revokedSessionIds: [],
        updatedAt: new Date().toISOString(),
      };
    }

    if (!store.revokedSessionIds.includes(sessionId)) {
      store.revokedSessionIds.push(sessionId);
      // Keep only last 100 revoked IDs to prevent unbounded growth
      if (store.revokedSessionIds.length > 100) {
        store.revokedSessionIds = store.revokedSessionIds.slice(-100);
      }
      await this.saveCredentialsStore(store);
    }
  }

  /**
   * Checks if session ID is revoked
   */
  async isSessionRevoked(sessionId: string): Promise<boolean> {
    const store = await this.getCredentialsStore();
    if (!store) return false;
    return store.revokedSessionIds.includes(sessionId);
  }
}
