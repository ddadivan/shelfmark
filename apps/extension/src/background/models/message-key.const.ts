/**
 * The worker's texts in `public/_locales/<locale>/messages.json`, read with `chrome.i18n.getMessage`
 * (the worker has no Transloco; Chrome picks the browser's language, `en` as the fallback).
 */
export const MESSAGE_KEY = {
  MenuSaveLink: 'menuSaveLink',
  MenuSavePage: 'menuSavePage',
  SavedTo: 'savedTo',
  AlreadySavedIn: 'alreadySavedIn',
  Unsorted: 'unsorted',
  SignInToSave: 'signInToSave',
  CannotSave: 'cannotSave',
  LibraryFull: 'libraryFull',
  SaveFailed: 'saveFailed',
  ActionTitle: 'actionTitle',
} as const;
