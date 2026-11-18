import { ApiProperty } from '@nestjs/swagger';
import { MCP_LIMIT, type CreateMcpTokenRequest } from '@shelfmark/contracts';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';

export class CreateMcpTokenDto implements CreateMcpTokenRequest {
  @ApiProperty({ minLength: 1, maxLength: MCP_LIMIT.NameMax, example: 'Claude Desktop' })
  @TrimString()
  @IsString()
  @NoControlChars()
  @MinLength(1)
  @MaxLength(MCP_LIMIT.NameMax)
  name!: string;

  @ApiProperty({ description: 'The assistant also sees the notes of the links (fixed per token)' })
  @IsBoolean()
  includeNotes!: boolean;
}
