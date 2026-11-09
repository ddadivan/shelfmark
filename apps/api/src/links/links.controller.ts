import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { LINK_IMAGE_KIND, type AuthUser } from '@shelfmark/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { CreateLinkDto } from './dto/create-link.dto';
import { LinkImageRecaptureService } from './images/link-image-recapture.service';
import { LinkImagesService } from './images/link-images.service';
import { sendLinkImage } from './images/send-link-image';
import { LinkPreviewRequestDto } from './dto/link-preview-request.dto';
import { LinkPreviewResponseDto } from './dto/link-preview-response.dto';
import { LinkResponseDto } from './dto/link-response.dto';
import { ListLinksQueryDto } from './dto/list-links-query.dto';
import { ListLinksResponseDto } from './dto/list-links-response.dto';
import { RecentLinksQueryDto } from './dto/recent-links-query.dto';
import { RecentLinksResponseDto } from './dto/recent-links-response.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { LinksWriteService } from './links-write.service';
import { LinksService } from './links.service';

@ApiTags('links')
@Controller('links')
export class LinksController {
  constructor(
    private readonly links: LinksService,
    private readonly writes: LinksWriteService,
    private readonly images: LinkImagesService,
    private readonly recapture: LinkImageRecaptureService,
  ) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.Preview)
  @ApiOkResponse({ type: LinkPreviewResponseDto })
  @ApiBadRequestResponse({ description: 'Not an http(s) URL' })
  @ApiOperation({
    summary: 'Title, icon and image of a URL plus the existing link when it is a duplicate',
    description:
      'An unreachable or unsuitable page is not an error: the answer is 200 with fetched=false and the URL as title.',
  })
  preview(
    @CurrentUser() user: AuthUser,
    @Body() body: LinkPreviewRequestDto,
  ): Promise<LinkPreviewResponseDto> {
    return this.links.preview(user.id, body.url);
  }

  @Get()
  @ApiOkResponse({ type: ListLinksResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid filter, cursor or limit' })
  @ApiOperation({ summary: 'List links with filters, search and cursor paging' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListLinksQueryDto,
  ): Promise<ListLinksResponseDto> {
    return this.links.list(user.id, query);
  }

  // Declared before `:id`, so "recent" is never read as an id.
  @Get('recent')
  @ApiOkResponse({ type: RecentLinksResponseDto })
  @ApiOperation({ summary: 'Recently opened links, newest open first' })
  recent(
    @CurrentUser() user: AuthUser,
    @Query() query: RecentLinksQueryDto,
  ): Promise<RecentLinksResponseDto> {
    return this.links.recent(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: LinkResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown or foreign link' })
  @ApiOperation({ summary: 'One link; foreign or missing is 404' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LinkResponseDto> {
    return this.links.get(user.id, id);
  }

  @Get(':id/favicon')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'The captured site icon (WebP, 32x32)' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign link, or no icon was captured' })
  @ApiOperation({ summary: 'Site icon of a link, same-origin' })
  async favicon(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    sendLinkImage(res, await this.images.find(user.id, id, LINK_IMAGE_KIND.Favicon));
  }

  @Get(':id/image')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'The captured preview image (WebP, 640x360)' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign link, or no image was captured' })
  @ApiOperation({ summary: 'Preview image of a link, same-origin' })
  async image(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    sendLinkImage(res, await this.images.find(user.id, id, LINK_IMAGE_KIND.Preview));
  }

  // Same budget as create: both fetch a page and up to two images from a third party.
  @Post(':id/images/capture')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.AddLink)
  @ApiOkResponse({
    type: LinkResponseDto,
    description:
      'The link after the call. Always 200: a call that did not claim the capture (cooldown, a concurrent request runs it) or found no image answers with the link as it is',
  })
  @ApiNotFoundResponse({ description: 'Unknown or foreign link' })
  @ApiOperation({
    summary: 'Re-capture the favicon and preview image of a link whose URL changed',
    description:
      'Claims the capture atomically (pending link, or past the one-hour cooldown), loads the page when no source hints are stored, and stores both images within the request budget.',
  })
  captureImages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LinkResponseDto> {
    return this.recapture.recapture(user.id, id);
  }

  @Post()
  @RateLimit(RATE_LIMIT.AddLink)
  @ApiCreatedResponse({ type: LinkResponseDto })
  @ApiOkResponse({
    type: LinkResponseDto,
    description: 'The idempotencyKey was already used: the link of the first request',
  })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign folder' })
  @ApiConflictResponse({ description: 'The link limit is reached' })
  @ApiOperation({
    summary: 'Save a link',
    description:
      'Without a title the server loads the page for it (the URL when that fails). Duplicate URLs are allowed.',
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateLinkDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LinkResponseDto> {
    const { link, created } = await this.writes.create(user.id, body, user.isDemo);
    if (!created) res.status(HttpStatus.OK);
    return link;
  }

  @Patch(':id')
  @ApiOkResponse({ type: LinkResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign link or folder' })
  @ApiOperation({ summary: 'Change any fields; tags replace the whole list' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateLinkDto,
  ): Promise<LinkResponseDto> {
    return this.writes.update(user.id, id, body);
  }

  @Post(':id/open')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LinkResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown or foreign link' })
  @ApiOperation({ summary: 'Record an open (updates lastOpenedAt)' })
  open(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LinkResponseDto> {
    return this.writes.open(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign link' })
  @ApiOperation({ summary: 'Delete a link' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.writes.remove(user.id, id);
  }
}
