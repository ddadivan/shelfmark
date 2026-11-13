import { FEEDBACK_ENDPOINT } from './feedback-endpoint.const';

/**
 * `POST` attaches one screenshot (`FeedbackScreenshotUpload`) to the user's message `id` and answers
 * the updated `FeedbackMessage`; `GET <path>/<position>` serves one (owner only). One image per
 * request keeps every body under the platform's request limit (a Vercel Function takes 4.5 MB).
 */
export function feedbackScreenshotsPath(id: string): string {
  return `${FEEDBACK_ENDPOINT.Messages}/${id}/screenshots`;
}
