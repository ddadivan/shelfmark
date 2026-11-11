import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackMessagesController } from './feedback-messages.controller';
import { FeedbackMessagesService } from './feedback-messages.service';
import { FeedbackService } from './feedback.service';

@Module({
  controllers: [FeedbackController, FeedbackMessagesController],
  providers: [FeedbackService, FeedbackMessagesService],
})
export class FeedbackModule {}
