import { applyDecorators } from '@nestjs/common';
import { RULE_LIMIT, TAG_LIMIT } from '@shelfmark/contracts';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { NormalizeTagList } from '../../views/dto/normalize-tag-list.decorator';

/** Tag names of a rule: normalised like link tags, de-duplicated, at most `RULE_LIMIT.TagsMax`. */
export const RuleTags = (): PropertyDecorator =>
  applyDecorators(
    NormalizeTagList(),
    IsArray(),
    ArrayMaxSize(RULE_LIMIT.TagsMax),
    IsString({ each: true }),
    NoControlChars(true, { each: true }),
    MaxLength(TAG_LIMIT.NameMax, { each: true }),
  );
