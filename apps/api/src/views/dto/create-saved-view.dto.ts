import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SAVED_VIEW_ICON,
  SAVED_VIEW_LIMIT,
  type CreateSavedViewRequest,
  type SavedViewIcon,
} from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsIn, IsObject, ValidateIf, ValidateNested } from 'class-validator';
import { SavedViewName } from './saved-view-name.decorator';
import { SavedViewQueryRequestDto } from './saved-view-query-request.dto';

export class CreateSavedViewDto implements CreateSavedViewRequest {
  @ApiProperty({ minLength: 1, maxLength: SAVED_VIEW_LIMIT.NameMax, example: 'To read' })
  @SavedViewName()
  name!: string;

  @ApiProperty({ type: SavedViewQueryRequestDto })
  @IsObject()
  @ValidateNested()
  @Type(() => SavedViewQueryRequestDto)
  query!: SavedViewQueryRequestDto;

  @ApiPropertyOptional({ enum: Object.values(SAVED_VIEW_ICON), nullable: true })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined && value !== null)
  @IsIn(Object.values(SAVED_VIEW_ICON))
  icon?: SavedViewIcon | null;
}
