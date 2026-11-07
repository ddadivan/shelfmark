import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

/**
 * First interceptor (PROJECT.md 5.1): sends the session cookie, but only to our own API. A
 * request to another origin never gets `withCredentials`.
 */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  const { origin } = globalThis.location;
  let target: URL;
  try {
    target = new URL(req.url, origin);
  } catch {
    return next(req);
  }
  const isApi = target.pathname === base || target.pathname.startsWith(`${base}/`);
  return next(target.origin === origin && isApi ? req.clone({ withCredentials: true }) : req);
};
