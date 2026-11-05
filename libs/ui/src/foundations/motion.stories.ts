import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../lib/button/button.component';
import { EASING_TOKENS } from './models/easing-tokens.const';
import { MOTION_PRESET_DEMOS } from './models/motion-preset-demos.const';
import { MOTION_TIMINGS } from './models/motion-timings.const';

/**
 * Docs-only: one row per Sass preset. The toggle shows or hides the box with `@if`, and the box
 * carries `animate.enter` / `animate.leave` classes, the same convention components use. A second
 * click mid-animation reverses it. The classes come from `.storybook/foundations.scss`.
 */
@Component({
  selector: 'ui-motion-demo',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (demo of demos; track demo.name) {
      <div class="fd-demo">
        <div class="fd-demo__text">
          <span class="fd-demo__label">{{ demo.label }}</span>
          <span class="fd-demo__timing"
            ><code class="fd-code">enter({{ demo.name }})</code> /
            <code class="fd-code">leave({{ demo.name }})</code> · {{ demo.timing }}</span
          >
        </div>
        <div class="fd-demo__stage">
          @if (shown(demo.name)) {
            <div
              class="fd-demo__box"
              [class]="'fd-demo__box fd-demo__box--' + demo.name"
              [animate.enter]="'fd-enter--' + demo.name"
              [animate.leave]="'fd-leave--' + demo.name"
            >
              @if (demo.name === 'spinner') {
                <span class="fd-demo__spin"></span>
              }
            </div>
          }
        </div>
        <ui-button variant="secondary" size="sm" (click)="toggle(demo.name)">
          {{ shown(demo.name) ? 'Hide' : 'Show' }}
        </ui-button>
      </div>
    }
  `,
})
class MotionDemoComponent {
  protected readonly demos = MOTION_PRESET_DEMOS;
  private readonly visible = signal<ReadonlySet<string>>(new Set(['pop']));

  protected shown(name: string): boolean {
    return this.visible().has(name);
  }

  protected toggle(name: string): void {
    this.visible.update((current) => {
      const next = new Set(current);
      if (!next.delete(name)) {
        next.add(name);
      }
      return next;
    });
  }
}

/** Docs-only: a dot slides along a track with each easing token, 320 ms. */
@Component({
  selector: 'ui-easing-demo',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fd-demo">
      <span class="fd-demo__text"
        ><span class="fd-demo__label">Easings, 320 ms</span
        ><span class="fd-demo__timing"
          >Under reduced motion the dot fades instead of moving.</span
        ></span
      >
      <ui-button variant="secondary" size="sm" (click)="moved.set(!moved())">Play</ui-button>
    </div>
    @for (e of easings; track e.name) {
      <div class="fd-demo">
        <span class="fd-demo__text"
          ><span class="fd-demo__label"
            ><code class="fd-code">--ease-{{ e.name }}</code></span
          ><span class="fd-demo__timing">{{ e.use }}</span></span
        >
        <div class="fd-ease" aria-hidden="true">
          <div
            class="fd-ease__dot"
            [class]="'fd-ease__dot fd-ease__dot--' + e.name"
            [class.is-moved]="moved()"
          ></div>
        </div>
      </div>
    }
  `,
})
class EasingDemoComponent {
  protected readonly easings = EASING_TOKENS;
  protected readonly moved = signal(false);
}

const meta: Meta = {
  title: 'Foundations/Motion',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Motion answers the user: fast in, faster out, only `transform` and `opacity`. Durations and easings come from tokens; presets are applied with the `enter($name)`, `leave($name)` and `loop($name)` Sass mixins, which include the `prefers-reduced-motion` fallback (movement and scale removed, fade kept; loaders slower). Turn on "Emulate CSS prefers-reduced-motion" in the browser dev tools to see it.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Durations: Story = {
  render: () => ({
    props: {
      durations: [
        { name: 'instant', ms: 80, use: 'press-down' },
        { name: 'fast', ms: 120, use: 'exits, hover and colour changes' },
        { name: 'base', ms: 200, use: 'entrances' },
        { name: 'slow', ms: 320, use: 'saved card, toasts, sheets' },
      ],
    },
    template: `
      <div class="fd-page">
        <table class="fd-table">
          <caption class="fd-sr-note">Duration tokens</caption>
          <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Length</th><th scope="col">Use</th></tr></thead>
          <tbody>
            @for (d of durations; track d.name) {
              <tr>
                <th scope="row"><code class="fd-code">--duration-{{ d.name }}</code></th>
                <td>{{ d.ms }} ms</td>
                <td><div class="fd-duration" [style.width.rem]="d.ms / 25"></div></td>
                <td>{{ d.use }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>`,
  }),
};

export const TimingTable: Story = {
  render: () => ({
    props: { rows: MOTION_TIMINGS },
    template: `
      <div class="fd-page">
        <table class="fd-table">
          <caption class="fd-sr-note">Motion timing table</caption>
          <thead>
            <tr><th scope="col">Moment</th><th scope="col">What moves</th><th scope="col">Timing</th><th scope="col">Sass</th></tr>
          </thead>
          <tbody>
            @for (r of rows; track r.moment) {
              <tr>
                <th scope="row">{{ r.moment }}</th>
                <td>{{ r.moves }}</td>
                <td>{{ r.timing }}</td>
                <td>@if (r.mixin) { <code class="fd-code">{{ r.mixin }}</code> } @else { component styles }</td>
              </tr>
            }
          </tbody>
        </table>
      </div>`,
  }),
};

export const LiveDemos: Story = {
  render: () => ({
    moduleMetadata: { imports: [MotionDemoComponent] },
    template: `<div class="fd-page"><ui-motion-demo /></div>`,
  }),
};

export const Easings: Story = {
  render: () => ({
    moduleMetadata: { imports: [EasingDemoComponent] },
    template: `<div class="fd-page"><ui-easing-demo /></div>`,
  }),
};
