import { Pipe, inject, type PipeTransform } from '@angular/core';
import { LocaleService } from './locale.service';

/**
 * `{{ value | appDate }}`: a date in the active language and the chosen date format
 * (`LocaleService.formatDate`). Used instead of Angular's `DatePipe`, which needs locale data per
 * language and does not know the Settings › Language choices. Impure on purpose: a pure pipe would
 * keep the old language for an unchanged value.
 */
@Pipe({ name: 'appDate', pure: false })
export class LocaleDatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(value: Date | number | string | null | undefined): string {
    return value === null || value === undefined || value === ''
      ? ''
      : this.locale.formatDate(value);
  }
}
