import { ApiProperty } from '@nestjs/swagger';
import { VIEW_DRAFT_LIMIT, type ViewDraftRequest } from '@shelfmark/contracts';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';

/**
 * `POST /api/ai/view-draft` (#535): the phrase trimmed and whitespace collapsed before the checks.
 * Never logged or stored.
 */
export class ViewDraftRequestDto implements ViewDraftRequest {
  @ApiProperty({ minLength: VIEW_DRAFT_LIMIT.PhraseMin, maxLength: VIEW_DRAFT_LIMIT.PhraseMax })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : value,
  )
  @IsString()
  @NoControlChars()
  @MinLength(VIEW_DRAFT_LIMIT.PhraseMin)
  @MaxLength(VIEW_DRAFT_LIMIT.PhraseMax)
  phrase!: string;
}
