import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { HealthModule } from '../health/health.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, HealthModule, UsersModule],
  providers: [
    // Guards run in registration order, and the order is security-relevant: the rate-limit guard
    // (`@nestjs/throttler`, #123) must be registered BEFORE this one, so a flood is rejected before
    // any session lookup hits the database. Keep every global guard here, in one visible list.
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
})
export class AppModule {}
