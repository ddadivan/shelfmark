import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ASK_LIMIT, type AskRequest } from '@shelfmark/contracts';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { AskTurnDto } from './ask-turn.dto';

/**
 * `POST /api/ai/ask`: the question trimmed and whitespace collapsed before the checks, and the open
 * chat's earlier turns (at most `ASK_LIMIT.HistoryTurnsMax`). Anything invalid is a JSON 400 before
 * the stream. Never logged or stored.
 */
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

  @ApiPropertyOptional({ type: [AskTurnDto], maxItems: ASK_LIMIT.HistoryTurnsMax })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ASK_LIMIT.HistoryTurnsMax)
  @ValidateNested({ each: true })
  @Type(() => AskTurnDto)
  history?: AskTurnDto[];
}
