/** Fixed error messages of the notification routes (clients key on the status). */
export const NOTIFICATION_ERROR_MESSAGE = {
  NotConfigured: 'Notifications are not configured on this server',
  DeviceLimit: 'Too many devices have notifications on',
  DeviceNotFound: 'Device not found',
  EndpointNotAllowed: 'The push service is not supported',
  QuietHoursPair: 'quietFrom and quietTo must both be set or both be null',
} as const;
