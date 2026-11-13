import { ApiProperty } from '@nestjs/swagger';
import { AUTH_PROVIDER, type AuthProvider, type ConnectedAccount } from '@shelfmark/contracts';

export class ConnectedAccountDto implements ConnectedAccount {
  @ApiProperty({ enum: Object.values(AUTH_PROVIDER) })
  provider!: AuthProvider;

  @ApiProperty({ format: 'date-time', description: 'When the provider was linked' })
  connectedAt!: string;
}
