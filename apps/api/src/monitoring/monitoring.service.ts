import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MonitoringConfig } from '@shelfmark/contracts';
import { INGEST_TIMEOUT_MS } from './models/ingest-timeout-ms.const';
import type { MonitoringSettings } from './models/monitoring-settings.interface';
import { MONITORING_SETTINGS } from './models/monitoring-settings.token';
import type { ParsedDsn } from './models/parsed-dsn.interface';
import { readEnvelopeDsn } from './read-envelope-dsn';

@Injectable()
export class MonitoringService {
  constructor(@Inject(MONITORING_SETTINGS) private readonly settings: MonitoringSettings) {}

  getConfig(): MonitoringConfig {
    return {
      dsn: this.settings.webDsn?.dsn ?? null,
      environment: this.settings.environment,
      release: this.settings.release,
    };
  }

  /**
   * Forwards a browser envelope to Sentry. The target is built from the DSN in our own
   * configuration, never from the request, and the envelope must name exactly one of our DSNs
   * (host, project and key), so this is not an open proxy.
   */
  async forward(envelope: Buffer): Promise<void> {
    const allowed = [this.settings.webDsn, this.settings.apiDsn].filter(
      (dsn): dsn is ParsedDsn => dsn !== undefined,
    );
    if (allowed.length === 0) throw new NotFoundException();

    const claimed = readEnvelopeDsn(envelope);
    const target = claimed
      ? allowed.find(
          (dsn) =>
            dsn.host === claimed.host &&
            dsn.projectId === claimed.projectId &&
            dsn.publicKey === claimed.publicKey,
        )
      : undefined;
    if (!target) throw new BadRequestException('Invalid envelope');

    let status: number;
    try {
      // No cookies or credentials are sent; redirects are refused.
      const response = await fetch(`https://${target.host}/api/${target.projectId}/envelope/`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-sentry-envelope' },
        body: new Uint8Array(envelope),
        redirect: 'error',
        signal: AbortSignal.timeout(INGEST_TIMEOUT_MS),
      });
      status = response.status;
    } catch {
      throw new BadGatewayException();
    }
    if (status < 200 || status >= 300) throw new BadGatewayException();
  }
}
