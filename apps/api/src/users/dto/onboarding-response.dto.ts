import { ApiProperty } from '@nestjs/swagger';
import type { OnboardingResponse } from '@shelfmark/contracts';

export class OnboardingResponseDto implements OnboardingResponse {
  @ApiProperty({
    format: 'date-time',
    description: 'When the onboarding was completed or skipped.',
  })
  onboardingCompletedAt!: string;
}
