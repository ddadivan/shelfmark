import { IsString, MaxLength } from 'class-validator';

export class CopyNoteDto {
  @IsString()
  @MaxLength(64)
  sourceId!: string;
}
