import { CARD_FIELD } from './card-field.const';
import type { CardField } from './card-field.type';

/** Translation keys of the card field switches in the View menu. */
export const CARD_FIELD_KEYS: Readonly<Record<CardField, string>> = {
  [CARD_FIELD.Note]: 'library.viewMenu.fields.note',
  [CARD_FIELD.Tags]: 'library.viewMenu.fields.tags',
  [CARD_FIELD.Folder]: 'library.viewMenu.fields.folder',
  [CARD_FIELD.Date]: 'library.viewMenu.fields.date',
  [CARD_FIELD.Description]: 'library.viewMenu.fields.description',
};
