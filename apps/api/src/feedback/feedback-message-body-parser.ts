import { json, type RequestHandler } from 'express';
import { FEEDBACK_ENDPOINT } from '@shelfmark/contracts';

/** A base64 image of `ScreenshotMaxBytes` is about 2.8 MB; the rest of the body is small. */
const FEEDBACK_MESSAGE_BODY_LIMIT = '3mb';

const parser = json({ limit: FEEDBACK_MESSAGE_BODY_LIMIT });
const ROUTE = new RegExp(`^${FEEDBACK_ENDPOINT.Messages}/?$`);

/**
 * JSON parser with the larger limit, applied to `POST /api/feedback/messages` only. Every other
 * request passes through untouched to the global 100kb parser.
 */
export const feedbackMessageBodyParser: RequestHandler = (req, res, next) => {
  if (req.method === 'POST' && ROUTE.test(req.path)) {
    parser(req, res, next);
    return;
  }
  next();
};
