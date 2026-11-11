import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { LINK_IMAGE_KIND, type LinkImageKind } from '@shelfmark/contracts';
import type { Response } from 'express';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { sendLinkImage } from '../links/images/send-link-image';
import { PublicCollectionQueryDto } from './dto/public-collection-query.dto';
import { PublicCollectionResponseDto } from './dto/public-collection-response.dto';
import { PUBLIC_COLLECTION_HEADERS } from './models/public-collection-headers.const';
import { PublicCollectionsService } from './public-collections.service';

/** Sets the public headers first, so a 404 or 429 carries them too. */
function setPublicHeaders(res: Response): void {
  for (const [name, value] of Object.entries(PUBLIC_COLLECTION_HEADERS)) {
    res.setHeader(name, value);
  }
}

/** Browser-only, always revalidated with the image's ETag. */
const PUBLIC_IMAGE_CACHE_CONTROL = 'private, no-cache';

/**
 * The read-only public collection page data and its images (#276, ADR 0040). Every handler is
 * anonymous on purpose and listed in `PUBLIC_ROUTES`: the token in the path is the capability.
 * None of them reads the session, and every miss is the same 404.
 */
@ApiTags('shares')
@Controller('public/collections/:token')
export class PublicCollectionsController {
  constructor(private readonly collections: PublicCollectionsService) {}

  // Public on purpose: guests open a shared collection without an account (PUBLIC_ROUTES).
  @AllowAnonymous()
  @RateLimit(RATE_LIMIT.PublicCollection)
  @Get()
  @ApiOkResponse({ type: PublicCollectionResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown, disabled or reset token, or a folder outside it' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiOperation({ summary: 'A shared folder with its subfolders and links, read-only' })
  collection(
    @Param('token') token: string,
    @Query() query: PublicCollectionQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicCollectionResponseDto> {
    setPublicHeaders(res);
    return this.collections.collection(token, query);
  }

  // Public on purpose: the icons of a shared collection page (PUBLIC_ROUTES).
  @AllowAnonymous()
  @RateLimit(RATE_LIMIT.PublicCollectionImage)
  @Get('links/:linkId/favicon')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'The captured site icon (WebP, 32x32)' })
  @ApiNotFoundResponse({ description: 'Unknown token, a link outside the subtree, or no icon' })
  @ApiOperation({ summary: 'Site icon of a link in a public collection' })
  favicon(
    @Param('token') token: string,
    @Param('linkId') linkId: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.send(res, token, linkId, LINK_IMAGE_KIND.Favicon);
  }

  // Public on purpose: the preview images of a shared collection page (PUBLIC_ROUTES).
  @AllowAnonymous()
  @RateLimit(RATE_LIMIT.PublicCollectionImage)
  @Get('links/:linkId/image')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'The captured preview image (WebP, 640x360)' })
  @ApiNotFoundResponse({ description: 'Unknown token, a link outside the subtree, or no image' })
  @ApiOperation({ summary: 'Preview image of a link in a public collection' })
  image(
    @Param('token') token: string,
    @Param('linkId') linkId: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.send(res, token, linkId, LINK_IMAGE_KIND.Preview);
  }

  private async send(
    res: Response,
    token: string,
    linkId: string,
    kind: LinkImageKind,
  ): Promise<void> {
    res.setHeader('X-Robots-Tag', PUBLIC_COLLECTION_HEADERS['X-Robots-Tag']);
    // Revalidated on every view (ETag, 304): a disabled or reset share stops serving at once
    // instead of living on in the browser cache for a year (ADR 0040).
    sendLinkImage(
      res,
      await this.collections.image(token, linkId, kind),
      PUBLIC_IMAGE_CACHE_CONTROL,
    );
  }
}
