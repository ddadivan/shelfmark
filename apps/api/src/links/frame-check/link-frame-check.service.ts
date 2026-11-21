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

    const verdict = (await this.cached(host)) ?? (await this.fetchAndStore(host, link.url));
    const added =
      verdict.framing === LINK_FRAMING.Blocked && (await this.addToNewTabHosts(userId, host));
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

  private async fetchAndStore(host: string, url: string): Promise<FrameVerdict> {
    const verdict: FrameVerdict = { framing: await this.probe(url), checkedAt: new Date() };
    await this.prisma.frameCheck.upsert({
      where: { host },
      create: { host, framing: verdict.framing, checkedAt: verdict.checkedAt },
      update: { framing: verdict.framing, checkedAt: verdict.checkedAt },
    });
    return verdict;
  }

  /** Any failure (blocked address, DNS, timeout) and any non-2xx answer is `unknown`. */
  private async probe(url: string): Promise<LinkFraming> {
    try {
      const page = await this.fetcher.fetchHeaders(url, FRAME_CHECK_FETCH_LIMITS);
      if (page.status < HTTP_OK_MIN || page.status > HTTP_OK_MAX) return LINK_FRAMING.Unknown;
      return decideFraming(page.headers);
    } catch {
      return LINK_FRAMING.Unknown;
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
