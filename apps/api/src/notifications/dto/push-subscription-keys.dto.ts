import { ApiProperty } from '@nestjs/swagger';
import type { PushSubscriptionKeys } from '@shelfmark/contracts';
import { Matches } from 'class-validator';

export class PushSubscriptionKeysDto implements PushSubscriptionKeys {
  /** 65 bytes as base64url (87 characters, padding allowed). */
  @ApiProperty({ description: 'The browser P-256 public key, base64url' })
  @Matches(/^[A-Za-z0-9_-]{87}=?$/, { message: 'keys.p256dh must be a base64url P-256 key' })
  p256dh!: string;

  /** 16 bytes as base64url (22 characters, padding allowed). */
  @ApiProperty({ description: 'The 16-byte auth secret, base64url' })
  @Matches(/^[A-Za-z0-9_-]{22}(==)?$/, { message: 'keys.auth must be a base64url 16-byte secret' })
  auth!: string;
}
