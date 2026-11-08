import { ALLOWED_PROTOCOLS } from './allowed-protocols.const';

export const DEFAULT_PORT_BY_PROTOCOL: Readonly<Record<string, number>> = {
  [ALLOWED_PROTOCOLS.Http]: 80,
  [ALLOWED_PROTOCOLS.Https]: 443,
};
