import { Injectable } from '@nestjs/common';
import {
  LINK_FRAMING,
  isPreviewableUrl,
  linkHost,
  type LinkFrameCheckResponse,
  type LinkFraming,
} from '@shelfmark/contracts';
import { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { PrismaService } from '../../prisma/prisma.service';
import { decideFraming } from './decide-framing';
import { FRAME_CHECK_FETCH_LIMITS } from './models/frame-check-fetch-limits.const';
import { FRAME_CHECK_TTL_MS } from './models/frame-check-ttl.const';
import type { FrameVerdict } from './models/frame-verdict.interface';
import { requireLiveLink } from '../link-ownership';

const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;

/** Two hosts of one site: equal once a leading `www.` is dropped. */
function sameSite(a: string, b: string): boolean {
  const bare = (host: string): string => host.replace(/^www\./, '');
  return bare(a) === bare(b);
}

/**
 * Link preview frame check (#553, ADR 0059): can the page of one of the user's links be shown in
 * the preview frame. The verdict is cached per host in `frame_checks` (not user data); a miss asks
 * the page through `SafeFetcherService.fetchHeaders`. It never changes the user's
 * `previewNewTabHosts`: only the user adds a site there (#555).
 */
@Injectable()
export class LinkFrameCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: SafeFetcherService,
  ) {}

  /** A foreign, missing or trashed link is the same 404. */
  async check(userId: string, linkId: string): Promise<LinkFrameCheckResponse> {
    const link = await requireLiveLink(this.prisma, userId, linkId, {
      select: { url: true },
    });

    const host = linkHost(link.url) ?? link.url;
    if (!isPreviewableUrl(link.url)) {
      // A page that cannot be framed at all: no request, no cache row, not added to the list.
      return this.answer(linkId, host, { framing: LINK_FRAMING.Blocked, checkedAt: new Date() });
    }

    const cached = await this.cached(host);
    const verdict = cached ?? (await this.fetchAndStore(host, link.url));
    return this.answer(linkId, host, verdict);
  }

  private answer(linkId: string, host: string, verdict: FrameVerdict): LinkFrameCheckResponse {
    return {
      linkId,
      host,
      framing: verdict.framing,
      checkedAt: verdict.checkedAt.toISOString(),
    };
  }

  private async cached(host: string): Promise<FrameVerdict | null> {
    const row = await this.prisma.frameCheck.findUnique({ where: { host } });
    if (!row) return null;
    const framing = toFraming(row.framing);
    if (framing === null) return null;
    return Date.now() - row.checkedAt.getTime() < FRAME_CHECK_TTL_MS[framing]
      ? { framing, checkedAt: row.checkedAt }
      : null;
  }

  /**
   * Probes the link's page. The verdict is stored for the host (and shared by every user) only
   * when the final page after redirects is on the same site (`www.` ignored): a short link or an
   * open redirect must not decide for the host it starts on.
   */
  private async fetchAndStore(host: string, url: string): Promise<FrameVerdict> {
    const probed = await this.probe(url);
    const verdict: FrameVerdict = { framing: probed.framing, checkedAt: new Date() };
    const stored = probed.finalHost === null || sameSite(probed.finalHost, host);
    if (stored) {
      await this.prisma.frameCheck.upsert({
        where: { host },
        create: { host, framing: verdict.framing, checkedAt: verdict.checkedAt },
        update: { framing: verdict.framing, checkedAt: verdict.checkedAt },
      });
    }
    return verdict;
  }

  /** Any failure (blocked address, DNS, timeout) and any non-2xx answer is `unknown`. */
  private async probe(url: string): Promise<{ framing: LinkFraming; finalHost: string | null }> {
    try {
      const page = await this.fetcher.fetchHeaders(url, FRAME_CHECK_FETCH_LIMITS);
      const finalHost = linkHost(page.finalUrl);
      if (page.status < HTTP_OK_MIN || page.status > HTTP_OK_MAX) {
        return { framing: LINK_FRAMING.Unknown, finalHost };
      }
      return { framing: decideFraming(page.headers), finalHost };
    } catch {
      return { framing: LINK_FRAMING.Unknown, finalHost: null };
    }
  }
}

function toFraming(value: string): LinkFraming | null {
  return (Object.values(LINK_FRAMING) as string[]).includes(value) ? (value as LinkFraming) : null;
}
