import { ApiProperty } from '@nestjs/swagger';
import type { ApiError } from '@shelfmark/contracts';

/** Swagger schema of the unified error body (`ApiError`). */
export class ApiErrorResponseDto implements ApiError {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'A string, or a list of strings for validation errors.',
  })
  message!: string | string[];

  @ApiProperty({ description: 'Echo of the X-Request-Id header, for support and logs.' })
  requestId!: string;
}
