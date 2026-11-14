import type {
  FeedbackMessage,
  FeedbackScreenshotUpload,
  SendFeedbackRequest,
} from '@shelfmark/contracts';

/** The feedback message endpoints (`/api/feedback/messages`) as the scenarios call them. */
export interface ContractFeedbackApi {
  list(): Promise<FeedbackMessage[]>;
  send(request: SendFeedbackRequest): Promise<FeedbackMessage>;
  /** `POST feedbackScreenshotsPath(id)`: attaches one screenshot. */
  attachScreenshot(id: string, upload: FeedbackScreenshotUpload): Promise<FeedbackMessage>;
}
