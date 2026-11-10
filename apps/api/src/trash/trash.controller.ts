import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto';
import { ListTrashResponseDto } from './dto/list-trash-response.dto';
import { TrashActionResponseDto } from './dto/trash-action-response.dto';
import { TrashItemsRequestDto } from './dto/trash-items-request.dto';
import { TrashService } from './trash.service';

@ApiTags('trash')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'No valid session' })
@Controller('trash')
export class TrashController {
  constructor(private readonly trash: TrashService) {}

  @Get()
  @ApiOperation({ summary: 'Trash: newest entries first; a folder entry stands for its subtree' })
  @ApiOkResponse({ type: ListTrashResponseDto })
  list(@CurrentUser() user: AuthUser): Promise<ListTrashResponseDto> {
    return this.trash.list(user.id);
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Put entries back; missing or foreign entries are skipped (count = handled)',
  })
  @ApiOkResponse({ type: TrashActionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid body' })
  restore(
    @CurrentUser() user: AuthUser,
    @Body() body: TrashItemsRequestDto,
  ): Promise<TrashActionResponseDto> {
    return this.trash.restore(user.id, body.items);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete entries for good; missing or foreign entries are skipped (count = handled)',
  })
  @ApiOkResponse({ type: TrashActionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid body' })
  remove(
    @CurrentUser() user: AuthUser,
    @Body() body: TrashItemsRequestDto,
  ): Promise<TrashActionResponseDto> {
    return this.trash.remove(user.id, body.items);
  }

  @Delete()
  @ApiOperation({ summary: 'Empty Trash: delete every entry for good' })
  @ApiOkResponse({ type: TrashActionResponseDto })
  empty(@CurrentUser() user: AuthUser): Promise<TrashActionResponseDto> {
    return this.trash.empty(user.id);
  }
}
