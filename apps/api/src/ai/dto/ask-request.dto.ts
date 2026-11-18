import { ApiProperty } from '@nestjs/swagger';
import { ASK_LIMIT, type AskRequest } from '@shelfmark/contracts';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';

/** `POST /api/ai/ask`: trimmed and whitespace collapsed before the checks. Never logged or stored. */
export class AskRequestDto implements AskRequest {
  @ApiProperty({ minLength: ASK_LIMIT.QuestionMin, maxLength: ASK_LIMIT.QuestionMax })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : value,
  )
  @IsString()
  @NoControlChars()
  @MinLength(ASK_LIMIT.QuestionMin)
  @MaxLength(ASK_LIMIT.QuestionMax)
  question!: string;
}
