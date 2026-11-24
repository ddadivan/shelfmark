import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from '../admin/admin.module';
import { AiModule } from '../ai/ai.module';
import { RediscoverModule } from '../rediscover/rediscover.module';
import { CleanupModule } from '../cleanup/cleanup.module';
import { AuthModule } from '../auth/auth.module';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CsrfGuard } from '../common/csrf/csrf.guard';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';
import {
  createRateLimitOptions,
  shouldTrustProxyHeaders,
} from '../common/rate-limit/rate-limit-options';
import { readAuthConfig } from '../config/auth-config';
import { readExtensionConfig } from '../config/extension-config';
import { DemoModule } from '../demo/demo.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { ExportModule } from '../export/export.module';
import { FoldersModule } from '../folders/folders.module';
import { HealthModule } from '../health/health.module';
import { LinksModule } from '../links/links.module';
import { McpModule } from '../mcp/mcp.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { PinsModule } from '../pins/pins.module';
import { ImportsModule } from '../imports/imports.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RemindersModule } from '../reminders/reminders.module';
import { ViewsModule } from '../views/views.module';
import { RulesModule } from '../rules/rules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SharesModule } from '../shares/shares.module';
import { TagsModule } from '../tags/tags.module';
import { TrashModule } from '../trash/trash.module';
import { UserActivityService } from '../users/user-activity.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    MonitoringModule,
    TagsModule,
    FoldersModule,
    LinksModule,
    DemoModule,
    FeedbackModule,
    AdminModule,
    UsersModule,
    ExportModule,
    SharesModule,
    TrashModule,
    PinsModule,
    ViewsModule,
    RemindersModule,
    NotificationsModule,
    RulesModule,
    AiModule,
    McpModule,
    RediscoverModule,
    CleanupModule,
    ImportsModule,
    // Async so the environment is read at DI time, not at import time.
    ThrottlerModule.forRootAsync({
      useFactory: () => createRateLimitOptions(shouldTrustProxyHeaders()),
    }),
  ],
  providers: [
    // Guards run in registration order, and the order is security-relevant: the rate limiter first,
    // so a flood is rejected before anything else; then the CSRF check (cheap, no database); then the
    // session guard, which hits the database. Keep every global guard here, in one visible list.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_GUARD,
      useFactory: () => new CsrfGuard(readAuthConfig().trustedOrigins, readExtensionConfig()),
    },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    // Used by SessionAuthGuard to record the day of activity (ADR 0045).
    UserActivityService,
    // The first interceptor is the outermost: logging sees the timeout's 504 as well.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
  ],
})
export class AppModule {}
