import { ApiProperty } from '@nestjs/swagger';
import { SAVED_VIEW_LIMIT, type CreateSavedViewRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
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
}
