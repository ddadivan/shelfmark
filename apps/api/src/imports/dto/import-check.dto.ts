import { ApiProperty } from '@nestjs/swagger';
import { IMPORT_LIMIT, LINK_LIMIT, type ImportCheckRequest } from '@shelfmark/contracts';
import { ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';
import { IsHttpUrl } from '../../links/dto/is-http-url.decorator';

export class ImportCheckDto implements ImportCheckRequest {
  @ApiProperty({
    type: [String],
    minItems: 1,
    maxItems: IMPORT_LIMIT.CheckBatchMax,
    description: `http(s) URLs, each at most ${LINK_LIMIT.UrlMax} characters, in file order`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IMPORT_LIMIT.CheckBatchMax)
  @IsHttpUrl({ each: true })
  urls!: string[];
}
