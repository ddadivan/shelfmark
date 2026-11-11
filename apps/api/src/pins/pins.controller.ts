import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PIN_KIND, type AuthUser, type PinKind } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { CreatePinDto } from './dto/create-pin.dto';
import { ListPinsResponseDto } from './dto/list-pins-response.dto';
import { ReorderPinsDto } from './dto/reorder-pins.dto';
import { PinsService } from './pins.service';

@ApiTags('pins')
@Controller('pins')
export class PinsController {
  constructor(private readonly pins: PinsService) {}

  @Get()
  @ApiOkResponse({ type: ListPinsResponseDto })
  @ApiOperation({ summary: 'Items pinned to the sidebar, in order (trashed ones are not listed)' })
  list(@CurrentUser() user: AuthUser): Promise<ListPinsResponseDto> {
    return this.pins.list(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ListPinsResponseDto, description: 'All pins afterwards; idempotent' })
  @ApiNotFoundResponse({ description: 'Unknown, foreign or trashed folder or link' })
  @ApiConflictResponse({ description: 'Seven items are already pinned' })
  @ApiOperation({ summary: 'Pin a folder or link to the end of the sidebar pins' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreatePinDto): Promise<ListPinsResponseDto> {
    return this.pins.pin(user.id, body);
  }

  // Declared before `:kind/:id`; different method and depth, kept adjacent for readability.
  @Put('order')
  @ApiOkResponse({ type: ListPinsResponseDto })
  @ApiBadRequestResponse({ description: 'The list is not exactly the set of pinned items' })
  @ApiOperation({ summary: 'Reorder the pins: every pinned item once, in the new order' })
  reorder(
    @CurrentUser() user: AuthUser,
    @Body() body: ReorderPinsDto,
  ): Promise<ListPinsResponseDto> {
    return this.pins.reorder(user.id, body.items);
  }

  @Delete(':kind/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Unpinned; idempotent' })
  @ApiNotFoundResponse({ description: 'Unknown, foreign or trashed folder or link' })
  @ApiOperation({ summary: 'Unpin a folder or link' })
  async unpin(
    @CurrentUser() user: AuthUser,
    @Param('kind', new ParseEnumPipe(PIN_KIND)) kind: PinKind,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.pins.unpin(user.id, { kind, id });
  }
}
