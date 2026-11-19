import { Injectable } from '@nestjs/common';
import { ASK_TOOL_NAME } from '../../models/ask-tool-name.const';
import type { AskTool } from '../../models/ask-tool.interface';
import type { AskToolDefinition } from '../../models/ask-tool-definition.interface';
import { CountLinksAskTool } from './count-links.ask-tool';
import { GetLinkAskTool } from './get-link.ask-tool';
import { ListFoldersAskTool } from './list-folders.ask-tool';
import { ListTagsAskTool } from './list-tags.ask-tool';
import { RequestDeeperAnswerAskTool } from './request-deeper-answer.ask-tool';
import { SearchLinksAskTool } from './search-links.ask-tool';
import { ShowLinksAskTool } from './show-links.ask-tool';

/**
 * The Ask tools by name, in a fixed order (the tool list is part of the cached prompt prefix, so it
 * never changes between questions of one profile). The quick profile gets every tool; the deep
 * profile the same list without `request_deeper_answer`.
 */
@Injectable()
export class AskToolRegistry {
  private readonly tools: readonly AskTool[];

  constructor(
    search: SearchLinksAskTool,
    count: CountLinksAskTool,
    get: GetLinkAskTool,
    folders: ListFoldersAskTool,
    tags: ListTagsAskTool,
    show: ShowLinksAskTool,
    deeper: RequestDeeperAnswerAskTool,
  ) {
    this.tools = [search, count, get, folders, tags, show, deeper];
  }

  /** The tool of a name the model called, `undefined` for any other name. */
  find(name: string, withEscalation: boolean): AskTool | undefined {
    if (!withEscalation && name === ASK_TOOL_NAME.RequestDeeperAnswer) return undefined;
    return this.tools.find((tool) => tool.definition.name === name);
  }

  definitions(withEscalation: boolean): AskToolDefinition[] {
    return this.tools
      .filter(
        (tool) => withEscalation || tool.definition.name !== ASK_TOOL_NAME.RequestDeeperAnswer,
      )
      .map((tool) => tool.definition);
  }
}
