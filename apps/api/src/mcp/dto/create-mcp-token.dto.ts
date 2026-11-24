import { ApiProperty } from '@nestjs/swagger';
import {
  MCP_LIMIT,
  MCP_TOKEN_ACCESS,
  MCP_TOKEN_EXPIRY_DAYS,
  type CreateMcpTokenRequest,
  type McpTokenAccess,
  type McpTokenExpiry,
} from '@shelfmark/contracts';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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

  @ApiProperty({
    enum: Object.values(MCP_TOKEN_ACCESS),
    required: false,
    description: 'What the token may do; read when left out (fixed per token)',
  })
  @IsOptional()
  @IsIn(Object.values(MCP_TOKEN_ACCESS))
  access?: McpTokenAccess;

  @ApiProperty({
    enum: MCP_TOKEN_EXPIRY_DAYS,
    required: false,
    nullable: true,
    type: Number,
    description: 'Days until the token stops working; null or left out never expires',
  })
  @IsOptional()
  @IsIn([...MCP_TOKEN_EXPIRY_DAYS])
  expiresInDays?: McpTokenExpiry;
}
