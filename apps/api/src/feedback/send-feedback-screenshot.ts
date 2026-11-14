import type { Response } from 'express';
import { PRIVATE_NO_STORE } from '../common/interceptors/models/private-no-store.const';
import type { StoredFeedbackScreenshot } from './models/stored-feedback-screenshot.interface';

/**
 * Writes a stored screenshot: the stored type, no sniffing, inline, same-origin only, never cached
 * (it is private user content).
 */
export function sendFeedbackScreenshot(res: Response, screenshot: StoredFeedbackScreenshot): void {
  res
    .status(200)
    .setHeader('Content-Type', screenshot.contentType)
    .setHeader('X-Content-Type-Options', 'nosniff')
    .setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    .setHeader('Content-Disposition', 'inline')
    .setHeader('Content-Security-Policy', "sandbox; default-src 'none'")
    .setHeader('Cache-Control', PRIVATE_NO_STORE)
    .setHeader('Vary', 'Cookie')
    .send(Buffer.from(screenshot.bytes));
}
