import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { LookupFunction, Socket } from 'node:net';
import http from 'node:http';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { isBlockedAddress, isBlockedHostname } from './ip-policy';
import { ALLOWED_PROTOCOLS } from './models/allowed-protocols.const';
import { DEFAULT_ALLOWED_PORTS } from './models/allowed-ports.const';
import { DEFAULT_CHARSET } from './models/default-charset.const';
import { DEFAULT_PORT_BY_PROTOCOL } from './models/default-ports.const';
import { DEFAULT_FETCH_LIMITS } from './models/fetch-limits.const';
import type { FetchLimits } from './models/fetch-limits.interface';
import { FETCH_USER_AGENT } from './models/fetch-user-agent.const';
import type { HopResponse } from './models/hop-response.type';
import { HTML_CONTENT_TYPES } from './models/html-content-types.const';
import { REDIRECT_STATUSES } from './models/redirect-statuses.const';
import { SAFE_FETCH_ERROR_CODE } from './models/safe-fetch-error-code.const';
import type { SafeFetchResult } from './models/safe-fetch-result.interface';
import type { SafeFetcherOptions } from './models/safe-fetcher-options.interface';
import { SAFE_FETCHER_OPTIONS } from './models/safe-fetcher-options.const';
import type { DnsResolver } from './models/dns-resolver.type';
import type { AddressPolicy } from './models/address-policy.type';
import { SafeFetchError } from './safe-fetch.error';

const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;
const IDENTITY_ENCODING = 'identity';
const CHARSET_SNIFF_BYTES = 1024;
const HEADER_CHARSET = /charset\s*=\s*["']?([\w:.-]+)/i;
const META_CHARSET = /<meta[^>]+charset\s*=\s*["']?([\w:.-]+)/i;

const defaultResolver: DnsResolver = async (hostname) => {
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
};

function stripBrackets(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function decodeBody(bytes: Buffer, contentType: string): string {
  let label = HEADER_CHARSET.exec(contentType)?.[1];
  if (label === undefined) {
    const head = bytes.subarray(0, CHARSET_SNIFF_BYTES).toString('latin1');
    label = META_CHARSET.exec(head)?.[1];
  }
  try {
    return new TextDecoder(label ?? DEFAULT_CHARSET).decode(bytes);
  } catch {
    return new TextDecoder(DEFAULT_CHARSET).decode(bytes);
  }
}

/**
 * The only way the API makes outbound HTTP requests. Validates the URL, resolves DNS itself,
 * refuses blocked addresses and connects to exactly the validated addresses (no second lookup),
 * so a DNS rebinding answer cannot swap in a private address. Every redirect hop is validated again.
 */
@Injectable()
export class SafeFetcherService {
  private readonly limits: FetchLimits;
  private readonly resolve: DnsResolver;
  private readonly isAddressAllowed: AddressPolicy;
  private readonly allowedPorts: readonly number[];

  constructor(@Optional() @Inject(SAFE_FETCHER_OPTIONS) options?: SafeFetcherOptions) {
    this.limits = { ...DEFAULT_FETCH_LIMITS, ...options?.limits };
    this.resolve = options?.resolve ?? defaultResolver;
    this.isAddressAllowed = options?.isAddressAllowed ?? ((address) => !isBlockedAddress(address));
    this.allowedPorts = options?.allowedPorts ?? DEFAULT_ALLOWED_PORTS;
  }

  /**
   * `overrides` narrow or change the limits for this call only (for example a shorter budget for a
   * preview inside a request that has its own deadline); the service defaults stay untouched.
   */
  async fetch(rawUrl: string, overrides?: Partial<FetchLimits>): Promise<SafeFetchResult> {
    const limits: FetchLimits = { ...this.limits, ...overrides };
    const signal = AbortSignal.timeout(limits.totalTimeoutMs);
    let url = this.parseUrl(rawUrl, limits);
    for (let hop = 0; hop <= limits.maxRedirects; hop++) {
      const addresses = await this.resolveAllowed(url, signal);
      const response = await this.requestOnce(url, addresses, signal, limits);
      if ('result' in response) {
        return { finalUrl: url.href, ...response.result };
      }
      url = this.parseUrl(this.resolveRedirect(response.location, url), limits);
    }
    throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.TooManyRedirects, 'Too many redirects');
  }

  /** A malformed or empty `Location` is an invalid URL; the result still goes through `parseUrl`. */
  private resolveRedirect(location: string, base: URL): string {
    if (location.trim() === '') {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.InvalidUrl, 'Redirect target is empty');
    }
    try {
      return new URL(location, base).href;
    } catch {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.InvalidUrl, 'Redirect target is not valid');
    }
  }

  private parseUrl(rawUrl: string, limits: FetchLimits): URL {
    if (rawUrl.length > limits.maxUrlLength) {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.InvalidUrl, 'URL is too long');
    }
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.InvalidUrl, 'URL is not valid');
    }
    const protocols: readonly string[] = Object.values(ALLOWED_PROTOCOLS);
    if (!protocols.includes(url.protocol)) {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.DisallowedProtocol, 'Only http and https');
    }
    if (url.username !== '' || url.password !== '') {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.InvalidUrl, 'Credentials are not allowed');
    }
    const port = url.port === '' ? DEFAULT_PORT_BY_PROTOCOL[url.protocol] : Number(url.port);
    if (port === undefined || !this.allowedPorts.includes(port)) {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.DisallowedPort, 'Port is not allowed');
    }
    return url;
  }

  private async resolveAllowed(url: URL, signal: AbortSignal): Promise<readonly string[]> {
    const hostname = stripBrackets(url.hostname);
    if (isIP(hostname) === 0 && isBlockedHostname(hostname)) {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.BlockedAddress, 'Host is not allowed');
    }
    let addresses: readonly string[];
    if (isIP(hostname) !== 0) {
      addresses = [hostname];
    } else {
      try {
        addresses = await this.withTimeout(this.resolve(hostname), signal);
      } catch (error) {
        if (error instanceof SafeFetchError) {
          throw error;
        }
        throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.DnsFailure, 'Host could not be resolved');
      }
    }
    if (addresses.length === 0) {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.DnsFailure, 'Host could not be resolved');
    }
    // One blocked answer rejects the host: a mixed answer is how rebinding tricks start.
    if (!addresses.every((address) => this.isAddressAllowed(address))) {
      throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.BlockedAddress, 'Host is not allowed');
    }
    return addresses;
  }

  private withTimeout<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void =>
        reject(new SafeFetchError(SAFE_FETCH_ERROR_CODE.Timeout, 'Request timed out'));
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
      promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
    });
  }

  private requestOnce(
    url: URL,
    addresses: readonly string[],
    signal: AbortSignal,
    limits: FetchLimits,
  ): Promise<HopResponse> {
    const transport = url.protocol === ALLOWED_PROTOCOLS.Https ? https : http;
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      const entries = addresses.map((address) => ({
        address,
        family: isIP(address),
      }));
      if (options.all) {
        callback(null, entries);
        return;
      }
      const [first] = entries;
      callback(null, first?.address ?? '', first?.family ?? 0);
    };

    return new Promise<HopResponse>((resolve, reject) => {
      let settled = false;
      let connectTimer: NodeJS.Timeout | undefined;
      const finish = (action: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(connectTimer);
        signal.removeEventListener('abort', onAbort);
        action();
      };
      const fail = (error: SafeFetchError): void => {
        finish(() => reject(error));
        request.destroy();
      };
      const onAbort = (): void =>
        fail(new SafeFetchError(SAFE_FETCH_ERROR_CODE.Timeout, 'Request timed out'));

      const request = transport.request(
        url,
        {
          method: 'GET',
          // A fresh, unshared agent per request: no keep-alive pool. Proxy environment variables
          // (NODE_USE_ENV_PROXY, HTTP_PROXY) are not honoured: a proxy would resolve DNS itself and
          // bypass the pinned lookup.
          agent: false,
          lookup: pinnedLookup,
          // No cookies and no credentials are ever sent.
          headers: {
            'User-Agent': FETCH_USER_AGENT,
            Accept: `${HTML_CONTENT_TYPES.Html},${HTML_CONTENT_TYPES.Xhtml};q=0.9`,
            'Accept-Encoding': 'identity',
            Connection: 'close',
          },
        },
        (response) => {
          this.handleResponse(response, limits, finish, () => settled, resolve, reject, fail);
        },
      );

      request.on('socket', (socket: Socket) => {
        if (socket.connecting) {
          connectTimer = setTimeout(
            () => fail(new SafeFetchError(SAFE_FETCH_ERROR_CODE.Timeout, 'Connection timed out')),
            limits.connectTimeoutMs,
          );
          socket.once('connect', () => clearTimeout(connectTimer));
        }
      });
      request.on('error', () => {
        fail(new SafeFetchError(SAFE_FETCH_ERROR_CODE.NetworkError, 'Request failed'));
      });

      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
      request.end();
    });
  }

  private handleResponse(
    response: IncomingMessage,
    limits: FetchLimits,
    finish: (action: () => void) => void,
    isSettled: () => boolean,
    resolve: (value: HopResponse) => void,
    reject: (reason: SafeFetchError) => void,
    fail: (error: SafeFetchError) => void,
  ): void {
    const status = response.statusCode ?? 0;
    const location = response.headers.location;

    if (REDIRECT_STATUSES.includes(status) && location !== undefined) {
      response.destroy();
      finish(() => resolve({ location }));
      return;
    }
    if (status < HTTP_OK_MIN || status > HTTP_OK_MAX) {
      response.destroy();
      finish(() =>
        reject(new SafeFetchError(SAFE_FETCH_ERROR_CODE.HttpError, 'Unexpected status', status)),
      );
      return;
    }

    const encoding = (response.headers['content-encoding'] ?? IDENTITY_ENCODING)
      .trim()
      .toLowerCase();
    if (encoding !== IDENTITY_ENCODING) {
      fail(new SafeFetchError(SAFE_FETCH_ERROR_CODE.UnsupportedEncoding, 'Response is compressed'));
      return;
    }

    const contentTypeHeader = response.headers['content-type'] ?? '';
    const contentType = (contentTypeHeader.split(';')[0] ?? '').trim().toLowerCase();
    const htmlTypes: readonly string[] = Object.values(HTML_CONTENT_TYPES);
    if (!htmlTypes.includes(contentType)) {
      fail(new SafeFetchError(SAFE_FETCH_ERROR_CODE.NotHtml, 'Response is not HTML'));
      return;
    }
    const declaredLength = Number(response.headers['content-length']);
    if (Number.isFinite(declaredLength) && declaredLength > limits.maxBodyBytes) {
      fail(new SafeFetchError(SAFE_FETCH_ERROR_CODE.TooLarge, 'Response is too large'));
      return;
    }

    const chunks: Buffer[] = [];
    let received = 0;
    response.on('data', (chunk: Buffer) => {
      if (isSettled()) {
        return;
      }
      received += chunk.length;
      if (received > limits.maxBodyBytes) {
        fail(new SafeFetchError(SAFE_FETCH_ERROR_CODE.TooLarge, 'Response is too large'));
        return;
      }
      chunks.push(chunk);
    });
    response.on('end', () => {
      finish(() =>
        resolve({
          result: {
            status,
            contentType,
            body: decodeBody(Buffer.concat(chunks), contentTypeHeader),
          },
        }),
      );
    });
    response.on('error', () => {
      fail(new SafeFetchError(SAFE_FETCH_ERROR_CODE.NetworkError, 'Response failed'));
    });
  }
}
