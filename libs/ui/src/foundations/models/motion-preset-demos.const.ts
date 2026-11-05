import type { MotionPresetDemo } from './motion-preset-demo.interface';

export const MOTION_PRESET_DEMOS: readonly MotionPresetDemo[] = [
  { name: 'pop', label: 'Menu, listbox, dialog', timing: '200 ms in, 120 ms out, ease-out' },
  { name: 'toast', label: 'Toast', timing: '320 ms in (ease-out), 120 ms out (ease-in)' },
  { name: 'sheet', label: 'Bottom sheet', timing: '320 ms in (ease-drawer), 200 ms out (ease-in)' },
  { name: 'fade', label: 'Skeleton to content', timing: '200 ms in, 120 ms out, ease-out' },
  {
    name: 'spinner',
    label: 'Spinner',
    timing: '200 ms in, 120 ms out; the ring spins with loop(spin)',
  },
];
