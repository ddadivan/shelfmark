import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LINK_ERROR_MESSAGE,
  LINK_FRAMING,
  USER_LIMIT,
  isPreviewHost,
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

const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;

/** Never used: `cached` or `fresh` is always set; keeps the types honest without `!`. */
const NO_VERDICT: FrameVerdict = { framing: LINK_FRAMING.Unknown, checkedAt: new Date(0) };

/** Two hosts of one site: equal once a leading `www.` is dropped. */
function sameSite(a: string, b: string): boolean {
  const bare = (host: string): string => host.replace(/^www\./, '');
  return bare(a) === bare(b);
}

/**
 * Link preview frame check (#553, ADR 0059): can the page of one of the user's links be shown in
 * the preview frame. The verdict is cached per host in `frame_checks` (not user data); a miss asks
 * the page through `SafeFetcherService.fetchHeaders`. A `blocked` host is appended to the user's
 * `previewNewTabHosts` in one conditional statement. Never call it inside a transaction.
 */
@Injectable()
export class LinkFrameCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: SafeFetcherService,
  ) {}

  /** A foreign, missing or trashed link is the same 404. */
  async check(userId: string, linkId: string): Promise<LinkFrameCheckResponse> {
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId, deletedAt: null },
      select: { url: true },
    });
    if (!link) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);

    const host = linkHost(link.url) ?? link.url;
    if (!isPreviewableUrl(link.url)) {
      // A page that cannot be framed at all: no request, no cache row, not added to the list.
      return this.answer(
        linkId,
        host,
        { framing: LINK_FRAMING.Blocked, checkedAt: new Date() },
        false,
      );
    }

    const cached = await this.cached(host);
    const fresh = cached === null ? await this.fetchAndStore(host, link.url) : null;
    const verdict: FrameVerdict = fresh?.verdict ?? cached ?? NO_VERDICT;
    // Only a fresh check that stayed on the link's site adds the host: a cached verdict never
    // re-adds a host the user removed, and a redirect to another site says nothing about this one.
    const added =
      fresh?.stored === true &&
      verdict.framing === LINK_FRAMING.Blocked &&
      (await this.addToNewTabHosts(userId, host));
    return this.answer(linkId, host, verdict, added);
  }

  private answer(
    linkId: string,
    host: string,
    verdict: FrameVerdict,
    addedToNewTabHosts: boolean,
  ): LinkFrameCheckResponse {
    return {
      linkId,
      host,
      framing: verdict.framing,
      checkedAt: verdict.checkedAt.toISOString(),
      addedToNewTabHosts,
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
  private async fetchAndStore(
    host: string,
    url: string,
  ): Promise<{ verdict: FrameVerdict; stored: boolean }> {
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
    return { verdict, stored };
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

  /**
   * Appends the host in one statement: only while it is not there yet and the list has room, so
   * a repeat or a full list changes nothing. Plain SQL, so `updated_at` stays. True when added.
   */
  private async addToNewTabHosts(userId: string, host: string): Promise<boolean> {
    if (!isPreviewHost(host)) return false;
    const changed = await this.prisma.$executeRaw`
      UPDATE users
      SET preview_new_tab_hosts = array_append(preview_new_tab_hosts, ${host})
      WHERE id = ${userId}::uuid
        AND NOT (${host} = ANY (preview_new_tab_hosts))
        AND cardinality(preview_new_tab_hosts) < ${USER_LIMIT.PreviewNewTabHostsMax}`;
    return changed > 0;
  }
}

function toFraming(value: string): LinkFraming | null {
  return (Object.values(LINK_FRAMING) as string[]).includes(value) ? (value as LinkFraming) : null;
}
