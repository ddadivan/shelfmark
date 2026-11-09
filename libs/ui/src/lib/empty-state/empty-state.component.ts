import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { HeadingLevel } from '../heading';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { IllustrationComponent } from '../illustration/illustration.component';
import type { IllustrationMotion } from '../illustration/models/illustration-motion.type';
import type { IllustrationName } from '../illustration/models/illustration-name.type';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * Invites the next action when a space has nothing in it: an `illustration` scene or an
 * `icon` tile, a heading, a line of text and one projected action (a `ui-button`).
 * The art is decorative: the heading names the state. All text comes in through inputs; the
 * heading input is `heading` (not `title`, which would add a native tooltip to the host).
 * `illustration` wins over `icon` when both are set.
 */
@Component({
  selector: 'ui-empty-state',
  imports: [IconComponent, IllustrationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-empty-state' },
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  /** Heading text. */
  readonly heading = input.required<string>();
  /** Supporting text under the heading. */
  readonly text = input<string>();
  /** Icon in a tinted tile; ignored when `illustration` is set. */
  readonly icon = input<IconName>();
  /** Illustration scene shown instead of the icon tile. */
  readonly illustration = input<IllustrationName>();
  /** Motion of the illustration; omit for the scene's default. */
  readonly illustrationMotion = input<IllustrationMotion>();
  /** Heading level, 2 by default. */
  readonly headingLevel = input<HeadingLevel>(2);
}
