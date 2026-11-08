import { BadGatewayException } from '@nestjs/common';

/** The Sentry tunnel could not reach Sentry. Never reported back to Sentry. */
export class TunnelUpstreamException extends BadGatewayException {}
