import { ApiProperty } from '@nestjs/swagger';
import type { ReaderSpan } from '@shelfmark/contracts';

export class ReaderSpanDto implements ReaderSpan {
  @ApiProperty({ description: 'Plain text (never HTML)', example: 'signal()' })
  text!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Absolute http(s) link target (opened in a new tab by the client); null for none',
  })
  href!: string | null;

  @ApiProperty({ description: 'Inline code' })
  code!: boolean;

  @ApiProperty({ description: 'Emphasis' })
  emphasis!: boolean;

  @ApiProperty({ description: 'Strong emphasis' })
  strong!: boolean;
}
