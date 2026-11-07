import { ApiProperty } from '@nestjs/swagger';
import { TAG_LIMIT } from '@shelfmark/contracts';
import type { CreateTagRequest } from '@shelfmark/contracts';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeTagName } from './normalize-tag-name.decorator';

export class CreateTagDto implements CreateTagRequest {
  @ApiProperty({ minLength: 1, maxLength: TAG_LIMIT.NameMax, example: 'to-read' })
  @NormalizeTagName()
  @IsString()
  @MinLength(1)
  @MaxLength(TAG_LIMIT.NameMax)
  name!: string;
}
