export interface ToastRef {
  /** Closes the toast; does nothing if it is already gone or was replaced. */
  dismiss(): void;
}
