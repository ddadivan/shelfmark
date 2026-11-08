import { Injectable, NotFoundException } from '@nestjs/common';
import { LINK_ERROR_MESSAGE, type LinkImageKind } from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { LinkImageRecaptureService } from './link-image-recapture.service';
import type { StoredLinkImage } from './models/stored-link-image.interface';

/** Reads stored images for the same-origin endpoints. Always filtered by the session user. */
@Injectable()
export class LinkImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recapture: LinkImageRecaptureService,
  ) {}

  /**
   * A foreign link, a missing link and a link without that image are all the same 404. A miss on a
   * link whose page changed first tries one lazy re-capture within this request (ADR 0027 note);
   * the claim makes that a no-op for foreign links and during the cooldown.
   */
  async find(userId: string, linkId: string, kind: LinkImageKind): Promise<StoredLinkImage> {
    const first = await this.read(userId, linkId, kind);
    if (first) return first;
    if (await this.recapture.recapture(userId, linkId)) {
      const second = await this.read(userId, linkId, kind);
      if (second) return second;
    }
    throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
  }

  private async read(
    userId: string,
    linkId: string,
    kind: LinkImageKind,
  ): Promise<StoredLinkImage | null> {
    const row = await this.prisma.linkImage.findFirst({
      where: { linkId, kind, userId },
      select: { contentType: true, bytes: true, sha256: true },
    });
    return row
      ? { contentType: row.contentType, bytes: Buffer.from(row.bytes), sha256: row.sha256 }
      : null;
  }
}
