import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_LIMIT, type CreateAiDraftRequest } from '@shelfmark/contracts';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { DefaultHttpsScheme } from '../../links/dto/default-https-scheme.decorator';
import { IsHttpUrl } from '../../links/dto/is-http-url.decorator';

/** Upper bound of a preview description (the page's meta description, not stored). */
const DESCRIPTION_MAX = 1000;

/** `POST /api/ai/drafts`: the Add link preview, once loaded. */
export class CreateAiDraftDto implements CreateAiDraftRequest {
  @ApiProperty({
    format: 'uuid',
    description: 'One per Add link dialog; the save sends it as aiDraftId',
  })
  @IsUUID()
  draftId!: string;

  @ApiProperty({ maxLength: LINK_LIMIT.UrlMax, example: 'https://angular.dev/overview' })
  @DefaultHttpsScheme()
  @IsHttpUrl()
  url!: string;

  @ApiPropertyOptional({ maxLength: LINK_LIMIT.TitleMax })
  @IsOptional()
  @TrimString()
  @IsString()
  @NoControlChars()
  @MaxLength(LINK_LIMIT.TitleMax)
  title?: string;

  @ApiPropertyOptional({ maxLength: DESCRIPTION_MAX })
  @IsOptional()
  @IsString()
  @NoControlChars(true)
  @MaxLength(DESCRIPTION_MAX)
  description?: string;

  @ApiPropertyOptional({
    maxLength: LINK_LIMIT.NoteMax,
    description: 'Sent to the model only while "Include my notes" is on',
  })
  @IsOptional()
  @IsString()
  @NoControlChars(true)
  @MaxLength(LINK_LIMIT.NoteMax)
  note?: string;
}
