import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { HeadingLevel } from '../heading';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { IllustrationComponent } from '../illustration/illustration.component';
import type { IllustrationMotion } from '../illustration/models/illustration-motion.type';
import type { IllustrationName } from '../illustration/models/illustration-name.type';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { EMPTY_STATE_LAYOUT } from './models/empty-state-layout.const';
import type { EmptyStateLayout } from './models/empty-state-layout.type';

/**
 * Invites the next action when a space has nothing in it: an `illustration` scene or an
 * `icon` tile, a heading, a line of text and one projected action (a `ui-button`).
 * The art is decorative: the heading names the state. All text comes in through inputs; the
 * heading input is `heading` (not `title`, which would add a native tooltip to the host).
 * `illustration` wins over `icon` when both are set.
 * `layout="page"` is the page-level state (EmptyStates.dc.html, #315): a surface card that grows
 * into the free height of a flex-column parent, with a larger scene on a soft disc, the heading
 * and the text centred both ways. The scene plays once (reduced motion: its final frame).
 */
@Component({
  selector: 'ui-empty-state',
  imports: [IconComponent, IllustrationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-empty-state',
    '[class.ui-empty-state--page]': 'layout() === EMPTY_STATE_LAYOUT.Page',
  },
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly EMPTY_STATE_LAYOUT = EMPTY_STATE_LAYOUT;
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
  /** `inline` (default) inside a section, `page` as the page-level card that fills the column. */
  readonly layout = input<EmptyStateLayout>(EMPTY_STATE_LAYOUT.Inline);
}
