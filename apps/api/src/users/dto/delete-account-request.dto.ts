import { ApiProperty } from '@nestjs/swagger';
import { USER_LIMIT } from '@shelfmark/contracts';
import type { DeleteAccountRequest } from '@shelfmark/contracts';
import { IsEmail, MaxLength } from 'class-validator';

export class DeleteAccountRequestDto implements DeleteAccountRequest {
  @ApiProperty({
    format: 'email',
    maxLength: USER_LIMIT.EmailMax,
    description: 'The signed-in account email, typed again to confirm the deletion.',
  })
  @IsEmail()
  @MaxLength(USER_LIMIT.EmailMax)
  email!: string;
}
