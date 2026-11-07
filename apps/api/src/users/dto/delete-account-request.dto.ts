import { ApiProperty } from '@nestjs/swagger';
import type { DeleteAccountRequest } from '@shelfmark/contracts';
import { IsEmail, MaxLength } from 'class-validator';

export class DeleteAccountRequestDto implements DeleteAccountRequest {
  @ApiProperty({
    format: 'email',
    maxLength: 320,
    description: 'The signed-in account email, typed again to confirm the deletion.',
  })
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
