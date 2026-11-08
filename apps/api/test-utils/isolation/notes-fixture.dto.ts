import { IsString, MaxLength } from 'class-validator';

export class NoteBodyDto {
  @IsString()
  @MaxLength(200)
  text!: string;
}
