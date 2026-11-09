import { Injectable, NotFoundException } from '@nestjs/common';
import { LINK_ERROR_MESSAGE, type LinkImageKind } from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import type { StoredLinkImage } from './models/stored-link-image.interface';

/** Reads stored images for the same-origin endpoints. Always filtered by the session user. */
@Injectable()
export class LinkImagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** A foreign link, a missing link and a link without that image are all the same 404. */
  async find(userId: string, linkId: string, kind: LinkImageKind): Promise<StoredLinkImage> {
    const row = await this.prisma.linkImage.findFirst({
      where: { linkId, kind, userId },
      select: { contentType: true, bytes: true, sha256: true },
    });
    if (!row) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    return { contentType: row.contentType, bytes: Buffer.from(row.bytes), sha256: row.sha256 };
  }
}
