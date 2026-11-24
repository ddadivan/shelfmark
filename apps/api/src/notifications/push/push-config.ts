import { Logger } from '@nestjs/common';
import { PUSH_ENV } from '../models/push-env.const';
import type { PushConfig } from '../models/push-config.interface';

/** Uncompressed P-256 point (65 bytes) in base64url without padding. */
const PUBLIC_KEY_SHAPE = /^[A-Za-z0-9_-]{87}$/;
/** 32-byte private scalar in base64url without padding. */
const PRIVATE_KEY_SHAPE = /^[A-Za-z0-9_-]{43}$/;
/** A contact the push services can reach: `mailto:` or an `https:` URL, no spaces. */
const SUBJECT_SHAPE = /^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/;

const logger = new Logger('PushConfig');

/**
 * Reads the VAPID keys once at DI time. All three unset = not configured (nothing is sent, the
 * settings answer `available: false`). A partial or malformed set is also "not configured" with one
 * warning that names the variable, never a value: a notification misconfiguration must not stop the
 * API from booting.
 */
export function readPushConfig(env: NodeJS.ProcessEnv = process.env): PushConfig {
  const publicKey = env[PUSH_ENV.PublicKey]?.trim() ?? '';
  const privateKey = env[PUSH_ENV.PrivateKey]?.trim() ?? '';
  const subject = env[PUSH_ENV.Subject]?.trim() ?? '';
  if (publicKey === '' && privateKey === '' && subject === '') {
    return { vapid: null };
  }
  const problem = !PUBLIC_KEY_SHAPE.test(publicKey)
    ? PUSH_ENV.PublicKey
    : !PRIVATE_KEY_SHAPE.test(privateKey)
      ? PUSH_ENV.PrivateKey
      : !SUBJECT_SHAPE.test(subject)
        ? PUSH_ENV.Subject
        : null;
  if (problem !== null) {
    logger.warn(`Web Push is not configured: ${problem} is missing or malformed`);
    return { vapid: null };
  }
  return { vapid: { publicKey, privateKey, subject } };
}
