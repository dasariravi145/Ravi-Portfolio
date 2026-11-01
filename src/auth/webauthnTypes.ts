import type { AuthenticatorTransport } from '@simplewebauthn/server';

export interface EnrolledPasskey {
  id: string; // Base64URL string
  publicKey: string; // Base64URL string
  counter: number;
  transports?: AuthenticatorTransport[];
  deviceType?: 'singleDevice' | 'multiDevice';
  backedUp?: boolean;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface HashedRecoveryCode {
  codeHash: string; // SHA-256 hex string
  used: boolean;
  usedAt?: string;
}

export interface WebAuthnCredentialsStore {
  schemaVersion: number;
  enrolled: boolean;
  ownerEmail: string;
  rpId: string;
  origin: string;
  credentials: EnrolledPasskey[];
  recoveryCodes: HashedRecoveryCode[];
  revokedSessionIds: string[];
  updatedAt: string;
}

export interface StoredChallenge {
  challenge: string;
  purpose: 'setup' | 'login' | 'add_backup';
  userEmail: string;
  createdAt: number;
  expiresAt: number; // TTL (e.g. 2 minutes)
}

export interface SessionPayload {
  sessionId: string;
  email: string;
  role: 'owner';
  createdAt: number;
  expiresAt: number;
}
