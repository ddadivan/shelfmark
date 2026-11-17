import { Injectable } from '@nestjs/common';
import {
  hostMatchesDomain,
  normalizeRuleDomain,
  RULE_LIMIT,
  RULE_OFFER_LIMIT,
  ruleHost,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  type RuleOfferResponse,
} from '@shelfmark/contracts';
import { domainToUnicode } from 'node:url';
import { escapeLike } from '../../common/util/escape-like';
import { PrismaService } from '../../prisma/prisma.service';
import type { RuleOfferCandidate } from '../models/rule-offer-candidate.interface';
import { detectRuleOffer } from './detect-rule-offer';

/**
 * Rule offers (AI-2, #390, ADR 0049): "Always put youtube.com links in Videos?" when the user's
 * newest links of a site share one folder. Derived from the user's own links on request; nothing is
 * recorded about what the user did, only "Not now" per site. Rules are not AI: AI settings are not
 * read here. Every statement filters by the session `userId`.
 */
@Injectable()
export class RuleOffersService {
  constructor(private readonly prisma: PrismaService) {}

  /** `POST /api/rules/offers/check`: read-only; the first site that qualifies, else `null`. */
  async check(userId: string, linkIds: readonly string[]): Promise<RuleOfferResponse> {
    const filed = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, folderId: { not: null }, id: { in: [...linkIds] } },
      select: { id: true, url: true },
    });
    const order = new Map(linkIds.map((id, index) => [id, index]));
    filed.sort((x, y) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0));
    const hosts: string[] = [];
    for (const link of filed) {
      const host = ruleHost(link.url);
      // Only a host a rule can store (no IP address, no single label).
      if (host === null || normalizeRuleDomain(host) !== host || hosts.includes(host)) continue;
      hosts.push(host);
      if (hosts.length === RULE_OFFER_LIMIT.HostsPerCheckMax) break;
    }
    if (hosts.length === 0) return { offer: null };

    const rules = await this.prisma.linkRule.findMany({
      where: { userId },
      select: { domain: true },
    });
    if (rules.length >= RULE_LIMIT.PerUserMax) return { offer: null };
    const dismissed = await this.prisma.ruleOfferDismissal.findMany({
      where: { userId, domain: { in: hosts } },
      select: { domain: true },
    });
    const skip = new Set(dismissed.map((row) => row.domain));

    for (const host of hosts) {
      if (skip.has(host) || rules.some((rule) => hostMatchesDomain(host, rule.domain))) continue;
      const found = detectRuleOffer(host, await this.candidates(userId, host));
      if (found === null) continue;
      const live = await this.prisma.folder.findFirst({
        where: { id: found.folderId, userId, deletedAt: null },
        select: { id: true },
      });
      if (live) return { offer: { domain: host, folderId: found.folderId, count: found.count } };
    }
    return { offer: null };
  }

  /** `POST /api/rules/offers/dismiss` ("Not now"): remembered per site, idempotent. */
  async dismiss(userId: string, domain: string): Promise<void> {
    await this.prisma.ruleOfferDismissal.createMany({
      data: [{ userId, domain }],
      skipDuplicates: true,
    });
  }

  /**
   * The user's newest live links whose address contains the host (escaped `ILIKE`; a punycode host
   * may be stored in Unicode, so both spellings are searched), at most `CandidatesMax`.
   */
  private async candidates(userId: string, host: string): Promise<RuleOfferCandidate[]> {
    const spellings = [...new Set([host, domainToUnicode(host)].filter((name) => name !== ''))];
    const rows = await this.prisma.link.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: spellings.map((name) => ({
          url: { contains: escapeLike(name), mode: 'insensitive' as const },
        })),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: RULE_OFFER_LIMIT.CandidatesMax,
      select: {
        url: true,
        folderId: true,
        suggestions: {
          where: { kind: SUGGESTION_KIND.Folder, state: SUGGESTION_STATE.AutoApplied },
          select: { id: true },
          take: 1,
        },
      },
    });
    return rows.map((row) => ({
      url: row.url,
      folderId: row.folderId,
      autoFiled: row.suggestions.length > 0,
    }));
  }
}
