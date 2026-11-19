import type { NewViewModel } from './new-view-model.interface';

/** The filter rows of the new view dialog: the form without the phrase and the name. */
export type NewViewRows = Omit<NewViewModel, 'phrase' | 'name'>;
