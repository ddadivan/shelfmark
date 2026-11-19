import { ApiProperty } from '@nestjs/swagger';
import { ASK_LIMIT, type AskTurn } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { AskTurnLinkDto } from './ask-turn-link.dto';

/**
 * An earlier turn of the open chat, as the server sent it in `done.turn` (ADR 0055 point 6). The
 * answer allows twice `AnswerMaxChars` in UTF-16 units (markers and characters outside the BMP);
 * the server cuts it again. Unknown fields are refused by the global pipe.
 */
export class AskTurnDto implements AskTurn {
  @ApiProperty({ minLength: 1, maxLength: ASK_LIMIT.QuestionMax })
  @IsString()
  @NoControlChars()
  @MinLength(1)
  @MaxLength(ASK_LIMIT.QuestionMax)
  question!: string;

  @ApiProperty({ maxLength: ASK_LIMIT.AnswerMaxChars * 2 })
  @IsString()
  @NoControlChars(true)
  @MaxLength(ASK_LIMIT.AnswerMaxChars * 2)
  answer!: string;

  @ApiProperty({ type: [AskTurnLinkDto], maxItems: ASK_LIMIT.LinksPerTurnMax })
  @IsArray()
  @ArrayMaxSize(ASK_LIMIT.LinksPerTurnMax)
  @ValidateNested({ each: true })
  @Type(() => AskTurnLinkDto)
  links!: AskTurnLinkDto[];
}
