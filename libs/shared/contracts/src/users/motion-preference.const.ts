/**
 * The "Animations" setting. `system` follows `prefers-reduced-motion`; `reduced` removes movement
 * even when the device does not ask to (fades and loaders stay); `full` follows the app's normal
 * motion. `full` never overrides a device that asks for reduced motion.
 */
export const MOTION_PREFERENCE = { System: 'system', Full: 'full', Reduced: 'reduced' } as const;
