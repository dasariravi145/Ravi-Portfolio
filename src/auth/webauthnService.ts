import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { WebAuthnStore } from './webauthnStore';
import { signSession } from './sessionCookie';
import { EnrolledPasskey, SessionPayload } from './webauthnTypes';

export interface WebAuthnConfig {
  rpID: string;
  rpName: string;
  origins: string[];
}

export class WebAuthnService {
  constructor(
    private store: WebAuthnStore,
    private sessionSecret: string,
    private ownerEmail: string = 'dasariravid145@gmail.com'
  ) {}

  /**
   * Dynamically resolves RP ID and allowed origins based on request URL and environment
   */
  resolveConfig(reqUrl: string, configuredDomain?: string): WebAuthnConfig {
    const url = new URL(reqUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return {
        rpID: 'localhost',
        rpName: 'Ravi Dasari Portfolio (Local Development)',
        origins: [
          'http://localhost:8787',
          'http://127.0.0.1:8787',
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          url.origin,
        ],
      };
    }

    const domain = configuredDomain || 'ravi-portfolio.dsecops88.online';
    return {
      rpID: domain,
      rpName: 'Ravi Dasari Portfolio',
      origins: [`https://${domain}`],
    };
  }

  /**
   * Generates options for initial owner passkey registration
   */
  async getSetupRegistrationOptions(
    token: string | undefined | null,
    expectedToken: string | undefined | null,
    reqUrl: string,
    configuredDomain?: string
  ) {
    if (!token || !expectedToken || token !== expectedToken) {
      throw new Error('UNAUTHORIZED_SETUP_TOKEN: Invalid or missing admin setup token.');
    }

    const existing = await this.store.getCredentialsStore();
    if (existing && existing.enrolled) {
      throw new Error('ALREADY_ENROLLED: Admin authentication is already initialized. Public registration is prohibited.');
    }

    const config = this.resolveConfig(reqUrl, configuredDomain);
    const challengeId = crypto.randomUUID();

    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpID,
      userID: new TextEncoder().encode(this.ownerEmail),
      userName: this.ownerEmail,
      userDisplayName: 'Ravi Dasari (Portfolio Owner)',
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await this.store.saveChallenge(
      challengeId,
      options.challenge,
      'setup',
      this.ownerEmail,
      120 // 2 minutes
    );

    return { options, challengeId };
  }

  /**
   * Verifies initial owner passkey registration and establishes single-user identity
   */
  async verifySetupRegistration(
    token: string | undefined | null,
    expectedToken: string | undefined | null,
    challengeId: string,
    registrationResponse: RegistrationResponseJSON,
    credentialName: string = 'Primary Passkey',
    reqUrl: string,
    configuredDomain?: string
  ) {
    if (!token || !expectedToken || token !== expectedToken) {
      throw new Error('UNAUTHORIZED_SETUP_TOKEN: Invalid or missing admin setup token.');
    }

    const existing = await this.store.getCredentialsStore();
    if (existing && existing.enrolled) {
      throw new Error('ALREADY_ENROLLED: Admin authentication is already initialized.');
    }

    const storedChallenge = await this.store.consumeChallenge(challengeId);
    if (!storedChallenge || storedChallenge.purpose !== 'setup') {
      throw new Error('CHALLENGE_EXPIRED_OR_INVALID: Passkey enrollment challenge expired or invalid.');
    }

    const config = this.resolveConfig(reqUrl, configuredDomain);

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: config.origins,
      expectedRPID: config.rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('REGISTRATION_FAILED: WebAuthn cryptographic verification failed.');
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const newPasskey: EnrolledPasskey = {
      id: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: credentialName.trim() || 'Primary Passkey',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    // Generate 5 emergency single-use recovery codes
    const { plainCodes } = WebAuthnStore.generateRecoveryCodes();
    const hashedCodes = await Promise.all(
      plainCodes.map(async (c) => ({
        codeHash: await WebAuthnStore.hashRecoveryCode(c),
        used: false,
      }))
    );

    // Enroll initial owner atomically
    await this.store.enrollInitialOwner(
      this.ownerEmail,
      config.rpID,
      config.origins[0],
      newPasskey,
      hashedCodes
    );

    // Issue initial session token
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const sessionPayload: SessionPayload = {
      sessionId,
      email: this.ownerEmail,
      role: 'owner',
      createdAt: now,
      expiresAt: now + 8 * 3600 * 1000, // 8 hours
    };

    const sessionToken = await signSession(sessionPayload, this.sessionSecret);

    return {
      success: true,
      user: {
        email: this.ownerEmail,
        role: 'owner',
        authenticated: true,
      },
      recoveryCodes: plainCodes,
      sessionToken,
    };
  }

  /**
   * Generates authentication challenge options for owner sign-in
   */
  async getLoginAuthenticationOptions(reqUrl: string, configuredDomain?: string) {
    const storeData = await this.store.getCredentialsStore();
    if (!storeData || !storeData.enrolled || storeData.credentials.length === 0) {
      return { enrolled: false, options: null, challengeId: null };
    }

    const config = this.resolveConfig(reqUrl, configuredDomain);
    const challengeId = crypto.randomUUID();

    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      allowCredentials: storeData.credentials.map((cred) => ({
        id: cred.id,
        transports: cred.transports,
      })),
      userVerification: 'preferred',
    });

    await this.store.saveChallenge(
      challengeId,
      options.challenge,
      'login',
      this.ownerEmail,
      120 // 2 minutes
    );

    return { enrolled: true, options, challengeId };
  }

  /**
   * Verifies passkey authentication assertion
   */
  async verifyLoginAuthentication(
    challengeId: string,
    authenticationResponse: AuthenticationResponseJSON,
    reqUrl: string,
    configuredDomain?: string
  ) {
    const storeData = await this.store.getCredentialsStore();
    if (!storeData || !storeData.enrolled) {
      throw new Error('NOT_ENROLLED: Authentication is not configured.');
    }

    const storedChallenge = await this.store.consumeChallenge(challengeId);
    if (!storedChallenge || storedChallenge.purpose !== 'login') {
      throw new Error('CHALLENGE_EXPIRED_OR_INVALID: Authentication challenge expired or was already consumed.');
    }

    const enrolledCredential = storeData.credentials.find(
      (c) => c.id === authenticationResponse.id
    );

    if (!enrolledCredential) {
      throw new Error('UNRECOGNIZED_CREDENTIAL: Passkey credential ID is not enrolled for this portfolio.');
    }

    const config = this.resolveConfig(reqUrl, configuredDomain);

    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: config.origins,
      expectedRPID: config.rpID,
      credential: {
        id: enrolledCredential.id,
        publicKey: isoBase64URL.toBuffer(enrolledCredential.publicKey),
        counter: enrolledCredential.counter,
        transports: enrolledCredential.transports,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      throw new Error('AUTHENTICATION_FAILED: Cryptographic passkey signature verification failed.');
    }

    const newCounter = verification.authenticationInfo.newCounter;

    // Anti-replay check: counter must increase if authenticator supports counters
    if (newCounter > 0 && newCounter <= enrolledCredential.counter) {
      throw new Error('REPLAY_DETECTED: Authenticator signature counter did not advance.');
    }

    // Update credential counter
    await this.store.updateCredentialCounter(enrolledCredential.id, newCounter);

    // Generate signed session
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const sessionPayload: SessionPayload = {
      sessionId,
      email: this.ownerEmail,
      role: 'owner',
      createdAt: now,
      expiresAt: now + 8 * 3600 * 1000, // 8 hours
    };

    const sessionToken = await signSession(sessionPayload, this.sessionSecret);

    return {
      success: true,
      user: {
        email: this.ownerEmail,
        role: 'owner',
        authenticated: true,
      },
      sessionToken,
    };
  }

  /**
   * Generates registration options to add a secondary/backup passkey
   */
  async getAddBackupPasskeyOptions(reqUrl: string, configuredDomain?: string) {
    const storeData = await this.store.getCredentialsStore();
    if (!storeData || !storeData.enrolled) {
      throw new Error('NOT_ENROLLED: Authentication not initialized.');
    }

    const config = this.resolveConfig(reqUrl, configuredDomain);
    const challengeId = crypto.randomUUID();

    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpID,
      userID: new TextEncoder().encode(this.ownerEmail),
      userName: this.ownerEmail,
      userDisplayName: 'Ravi Dasari (Backup Device)',
      attestationType: 'none',
      excludeCredentials: storeData.credentials.map((c) => ({
        id: c.id,
        transports: c.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await this.store.saveChallenge(
      challengeId,
      options.challenge,
      'add_backup',
      this.ownerEmail,
      120
    );

    return { options, challengeId };
  }

  /**
   * Verifies and registers secondary/backup passkey
   */
  async verifyAddBackupPasskey(
    challengeId: string,
    registrationResponse: RegistrationResponseJSON,
    credentialName: string = 'Backup Passkey',
    reqUrl: string,
    configuredDomain?: string
  ) {
    const storedChallenge = await this.store.consumeChallenge(challengeId);
    if (!storedChallenge || storedChallenge.purpose !== 'add_backup') {
      throw new Error('CHALLENGE_EXPIRED_OR_INVALID: Challenge expired or already consumed.');
    }

    const config = this.resolveConfig(reqUrl, configuredDomain);

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: config.origins,
      expectedRPID: config.rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('REGISTRATION_FAILED: Backup passkey verification failed.');
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const newPasskey: EnrolledPasskey = {
      id: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: credentialName.trim() || 'Backup Passkey',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    await this.store.addBackupPasskey(newPasskey);

    return {
      success: true,
      passkey: {
        id: newPasskey.id,
        name: newPasskey.name,
        createdAt: newPasskey.createdAt,
      },
    };
  }

  /**
   * Recovers account using a single-use recovery code
   */
  async recoverWithCode(code: string) {
    const result = await this.store.consumeRecoveryCode(code);
    if (!result.success) {
      throw new Error('INVALID_RECOVERY_CODE: Recovery code is invalid or has already been used.');
    }

    // Issue a temporary recovery session (1-hour lifespan to allow adding new passkey)
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const sessionPayload: SessionPayload = {
      sessionId,
      email: this.ownerEmail,
      role: 'owner',
      createdAt: now,
      expiresAt: now + 3600 * 1000, // 1 hour recovery session
    };

    const sessionToken = await signSession(sessionPayload, this.sessionSecret);

    return {
      success: true,
      remainingCodes: result.remaining,
      user: {
        email: this.ownerEmail,
        role: 'owner',
        authenticated: true,
      },
      sessionToken,
    };
  }

  /**
   * Regenerates emergency recovery codes (must be authenticated)
   */
  async regenerateRecoveryCodes() {
    const { plainCodes } = WebAuthnStore.generateRecoveryCodes();
    const hashedCodes = await Promise.all(
      plainCodes.map(async (c) => ({
        codeHash: await WebAuthnStore.hashRecoveryCode(c),
        used: false,
      }))
    );

    await this.store.replaceRecoveryCodes(hashedCodes);
    return { plainCodes };
  }
}

