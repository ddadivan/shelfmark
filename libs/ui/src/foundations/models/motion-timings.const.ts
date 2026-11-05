import type { MotionTiming } from './motion-timing.interface';

export const MOTION_TIMINGS: readonly MotionTiming[] = [
  {
    moment: 'Menu, listbox',
    moves: 'fade + scale 0.96 to 1 from the trigger; out: fade + 0.98',
    timing: '200 / 120 ms, ease-out',
    mixin: 'enter(pop) / leave(pop)',
  },
  {
    moment: 'Dialog',
    moves: 'panel fade + scale 0.96 to 1 from the centre; out: ui-pop-out',
    timing: '200 / 120 ms, ease-out',
    mixin: 'enter(pop) / leave(pop)',
  },
  {
    moment: 'Bottom sheet (phone)',
    moves: 'slides up from below the screen',
    timing: '320 ms ease-drawer / 200 ms ease-in',
    mixin: 'enter(sheet) / leave(sheet)',
  },
  {
    moment: 'Toast',
    moves: 'slides up 12 px + fade; out: down 8 px + fade',
    timing: '320 / 120 ms, ease-out / ease-in',
    mixin: 'enter(toast) / leave(toast)',
  },
  {
    moment: 'Spinner',
    moves: 'grows in from 40%, label makes room; leaves the same way',
    timing: '200 / 120 ms, ease-out',
    mixin: 'enter(spinner-grow) / leave(spinner-shrink)',
  },
  {
    moment: 'Skeleton to content',
    moves: 'content fades in',
    timing: '200 ms, ease-out',
    mixin: 'enter(fade)',
  },
  {
    moment: 'Field focus',
    moves: 'border turns focus-ring + 3 px halo',
    timing: '120 ms, ease-out',
    mixin: 'field-focus',
  },
  {
    moment: 'Press a button',
    moves: 'scale 0.97 down, spring back',
    timing: '80 ms ease-out / 120 ms ease-spring',
    mixin: '',
  },
];
