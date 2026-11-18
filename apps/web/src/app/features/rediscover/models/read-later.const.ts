import { InjectionToken } from '@angular/core';
import type { ReadLaterCapability } from './read-later-capability.interface';

/** Seam for #396: "From your shelf" offers Read later only when this is provided. */
export const READ_LATER = new InjectionToken<ReadLaterCapability>('READ_LATER');
