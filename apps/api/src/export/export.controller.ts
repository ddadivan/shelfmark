import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { ExportQueryDto } from './dto/export-query.dto';
import { ExportService } from './export.service';
import { EXPORT_CONTENT_TYPE } from './models/export-content-type.const';

@ApiTags('export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * Streams the file: once the first bytes are sent, a database failure cannot change the status,
   * so the download aborts (truncated file, logged server-side without user data). Folder
   * ownership is checked before the stream starts, so a foreign folder is a clean 404.
   * HTML renders the whole library before its first byte, so a failure in that pass aborts the
   * stream too instead of answering 5xx. The source stream is destroyed when the client aborts.
   */
  // A full export reads every link of the user: stricter than the global default (PROJECT.md 5.8).
  @RateLimit(RATE_LIMIT.Export)
  @Get()
  @ApiProduces(...Object.values(EXPORT_CONTENT_TYPE))
  @ApiOkResponse({
    description: 'The export file as an attachment.',
    content: {
      [EXPORT_CONTENT_TYPE.Json]: { schema: { type: 'object' } },
      [EXPORT_CONTENT_TYPE.Html]: { schema: { type: 'string' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid query.' })
  @ApiUnauthorizedResponse({ description: 'No session.' })
  @ApiNotFoundResponse({ description: 'The folder does not exist or is not yours.' })
  async export(
    @CurrentUser() user: AuthUser,
    @Query() query: ExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.exportService.prepare(user.id, query);
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.on('close', () => {
      if (!res.writableFinished) file.body.destroy();
    });
    return new StreamableFile(file.body);
  }
}
