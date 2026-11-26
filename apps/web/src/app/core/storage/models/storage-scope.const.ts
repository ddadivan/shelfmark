/** Who a stored value belongs to. */
export const STORAGE_SCOPE = {
  /** What one user did on this device; `SessionScope.end()` removes it. */
  User: 'user',
  /** A preference of the device or browser; it survives sign-out. */
  Device: 'device',
} as const;
