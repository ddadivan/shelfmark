import { ApiProperty } from '@nestjs/swagger';
import type { AuthSession, AuthUser, DemoSessionResponse } from '@shelfmark/contracts';

class DemoUserDto implements AuthUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Demo user' })
  name!: string;

  @ApiProperty({ example: 'demo-0198…@demo.shelfmark.invalid' })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  image!: string | null;

  @ApiProperty({ example: true })
  isDemo!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  demoExpiresAt!: string | null;
}

class DemoSessionDto implements AuthSession {
  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

export class DemoSessionResponseDto implements DemoSessionResponse {
  @ApiProperty({ type: DemoUserDto })
  user!: DemoUserDto;

  @ApiProperty({ type: DemoSessionDto })
  session!: DemoSessionDto;
}
