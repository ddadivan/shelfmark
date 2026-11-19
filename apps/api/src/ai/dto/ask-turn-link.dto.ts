import { ApiProperty } from '@nestjs/swagger';
import { ASK_LIMIT, type AskTurnLink } from '@shelfmark/contracts';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

/** A link of an earlier turn: its marker number in the answer and its id (re-read for the session user). */
export class AskTurnLinkDto implements AskTurnLink {
  @ApiProperty({ minimum: 1, maximum: ASK_LIMIT.LinkMarkerMax })
  @IsInt()
  @Min(1)
  @Max(ASK_LIMIT.LinkMarkerMax)
  n!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
