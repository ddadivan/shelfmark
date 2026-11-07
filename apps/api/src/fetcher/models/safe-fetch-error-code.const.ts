export const SAFE_FETCH_ERROR_CODE = {
  InvalidUrl: 'invalid-url',
  DisallowedProtocol: 'disallowed-protocol',
  DisallowedPort: 'disallowed-port',
  BlockedAddress: 'blocked-address',
  DnsFailure: 'dns-failure',
  TooManyRedirects: 'too-many-redirects',
  Timeout: 'timeout',
  TooLarge: 'too-large',
  NotHtml: 'not-html',
  HttpError: 'http-error',
  NetworkError: 'network-error',
} as const;
