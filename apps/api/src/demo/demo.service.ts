import { createHmac, randomUUID } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DEMO_LIMIT } from '@shelfmark/contracts';
import { DemoSessionService } from '../auth/demo-session.service';
import type { DemoSessionStart } from '../auth/models/demo-session-start.interface';
import { readAuthConfig } from '../config/auth-config';
import { PrismaService } from '../prisma/prisma.service';
import { DEMO_SEED } from './demo-seed';
import { DemoQuotaExceededException } from './demo-quota-exceeded.exception';
import { DEMO_CREATE_LOCK } from './models/demo-lock.const';
import { DEMO_QUOTA } from './models/demo-quota.const';
import { DEMO_SOURCE_HASH_LABEL } from './models/demo-source-hash-label.const';
import { DEMO_USER } from './models/demo-user.const';
import { seedDemoLibrary } from './seed-demo-library';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_SECOND = 1000;

/**
 * Creates demo sandboxes (#67, ADR 0034): quota and cap checks, then the user and its seed library in
 * one transaction, then the session. There is no outbound request and no OAuth involved.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  private readonly hashKey = readAuthConfig().secret;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: DemoSessionService,
  ) {}

  /** `sourceKey` is the rate-limit client key (the client IP); only its HMAC is stored. */
  async create(sourceKey: string): Promise<DemoSessionStart> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEMO_LIMIT.SessionHours * MS_PER_HOUR);
    const sourceHash = this.hashSource(sourceKey);
    const id = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      // One global lock: the per-source quota and the active cap are exact, not racy. The hold time
      // is the few bulk statements below.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${DEMO_CREATE_LOCK}, 0))`;

      const recent = await tx.user.findMany({
        where: {
          isDemo: true,
          demoSourceHash: sourceHash,
          createdAt: { gt: new Date(now.getTime() - DEMO_QUOTA.WindowMs) },
        },
        orderBy: { createdAt: 'desc' },
        take: DEMO_QUOTA.PerSource,
        select: { createdAt: true },
      });
      if (recent.length >= DEMO_QUOTA.PerSource) {
        const oldest = recent[recent.length - 1].createdAt;
        const wait = oldest.getTime() + DEMO_QUOTA.WindowMs - now.getTime();
        throw new DemoQuotaExceededException(Math.max(1, Math.ceil(wait / MS_PER_SECOND)));
      }

      const active = await tx.user.count({
        where: { isDemo: true, demoExpiresAt: { gt: now } },
      });
      if (active >= DEMO_QUOTA.ActiveCap) throw new ServiceUnavailableException();

      await tx.user.create({
        data: {
          id,
          name: DEMO_USER.Name,
          email: `${DEMO_USER.EmailPrefix}${id}@${DEMO_USER.EmailDomain}`,
          emailVerified: true,
          isDemo: true,
          demoExpiresAt: expiresAt,
          demoSourceHash: sourceHash,
        },
      });
      await seedDemoLibrary(tx, id, DEMO_SEED, now);
    });

    try {
      return await this.sessions.start(id);
    } catch (error) {
      // No orphan sandbox without a way in: the cascade removes everything seeded.
      await this.prisma.user
        .deleteMany({ where: { id, isDemo: true } })
        .catch(() => this.logger.error('Could not remove a demo user after a failed sign-in'));
      throw error;
    }
  }

  /** HMAC-SHA256 of the client key, keyed with the auth secret: stable per client, useless without it. */
  private hashSource(sourceKey: string): string {
    return createHmac('sha256', this.hashKey)
      .update(`${DEMO_SOURCE_HASH_LABEL}${sourceKey}`)
      .digest('hex');
  }
}
