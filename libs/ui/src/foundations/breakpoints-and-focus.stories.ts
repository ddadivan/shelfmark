import type { Meta, StoryObj } from '@storybook/angular-vite';

const meta: Meta = {
  title: 'Foundations/Breakpoints and focus',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Breakpoints are in `em` (ADR 0015): phone below 40em, tablet 40em to 63.99em, desktop from 64em. Use the `phone`, `tablet`, `tablet-up` and `desktop` mixins. Focus uses the `focus-ring` and `field-focus` mixins; `visually-hidden` and `line-clamp` are shared helpers.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Breakpoints: Story = {
  render: () => ({
    template: `
      <div class="fd-page">
        <table class="fd-table">
          <caption class="fd-sr-note">Breakpoints</caption>
          <thead><tr><th scope="col">Range</th><th scope="col">Width</th><th scope="col">Mixin</th></tr></thead>
          <tbody>
            <tr><th scope="row">Phone</th><td>below 40em</td><td><code class="fd-code">phone</code></td></tr>
            <tr><th scope="row">Tablet</th><td>40em to 63.99em</td><td><code class="fd-code">tablet</code></td></tr>
            <tr><th scope="row">Tablet and up</th><td>40em and wider</td><td><code class="fd-code">tablet-up</code></td></tr>
            <tr><th scope="row">Desktop</th><td>64em and wider</td><td><code class="fd-code">desktop</code></td></tr>
          </tbody>
        </table>
        <p class="fd-viewport" role="status">
          Current range:
          <span class="fd-viewport__phone">phone</span>
          <span class="fd-viewport__tablet">tablet</span>
          <span class="fd-viewport__desktop">desktop</span>
        </p>
      </div>`,
  }),
};

export const Focus: Story = {
  render: () => ({
    template: `
      <div class="fd-page">
        <p class="fd-lead">Press Tab. Buttons, rows and cards get a solid 2px ring; text fields turn their border and add a soft halo (the wrapper includes the field-focus mixin, which also removes the outline from the bare input inside, so there is one indicator).</p>
        <button type="button" class="fd-focus-target">focus-ring</button>
        <label class="fd-field">
          <span class="fd-sr-note">field-focus</span>
          <input class="fd-field__input" type="text" placeholder="field-focus" />
        </label>
      </div>`,
  }),
};

export const Helpers: Story = {
  render: () => ({
    template: `
      <div class="fd-page">
        <p class="fd-clamp fd-clamp--2">line-clamp(2): a long card title that keeps going and going until the third line is cut off with an ellipsis, as the card spec asks for titles.</p>
        <p class="fd-clamp fd-clamp--1">line-clamp(1): a long domain name that gets cut after one line, example.com/very/long/path</p>
        <p class="fd-lead">visually-hidden: <span class="fd-sr-note">Step 2 of 4</span> a screen reader announces "Step 2 of 4" here; nothing is visible.</p>
      </div>`,
  }),
};
