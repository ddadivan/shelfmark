import { ApiProperty } from '@nestjs/swagger';
import { PIN_KIND, type PinKind, type PinRef } from '@shelfmark/contracts';
import { IsIn, IsUUID } from 'class-validator';

export class PinRefDto implements PinRef {
  @ApiProperty({ enum: Object.values(PIN_KIND) })
  @IsIn(Object.values(PIN_KIND))
  kind!: PinKind;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
