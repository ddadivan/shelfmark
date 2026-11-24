/** Limits of Settings › Notifications (shared by the DTOs and the web app). */
export const NOTIFICATION_LIMIT = {
  /** Devices with push on per account; one more is a 409. */
  DevicesPerUserMax: 10,
  /** A push subscription endpoint URL. */
  EndpointMax: 2048,
  /** The readable device name. */
  DeviceNameMax: 80,
  /** An IANA time zone name. */
  TimeZoneMax: 64,
} as const;
