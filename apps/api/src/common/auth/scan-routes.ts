import { type INestApplicationContext, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { API_GLOBAL_PREFIX } from '../../app/models/api-global-prefix.const';
import { currentUserFactory } from './current-user.decorator';
import { EXPECTED_ALL_VERB_MOUNTS } from './models/expected-all-verb-mount.const';
import { AUTH_METADATA_KEY } from './models/auth-metadata-key.const';
import type { FoundController } from './models/found-controller.interface';
import type { FoundRoute } from './models/found-route.interface';
import { PUBLIC_ROUTES } from './models/public-route.const';
import type { RouteScan } from './models/route-scan.interface';

function pathsOf(value: unknown): string[] {
  const list: unknown[] = Array.isArray(value) ? value : [value];
  const paths = list.filter((item): item is string => typeof item === 'string');
  return paths.length > 0 ? paths : [''];
}

function joinPath(...parts: string[]): string {
  const joined = parts
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `/${joined}`;
}

function hasMetadata(key: string, target: object): boolean {
  return Reflect.getMetadata(key, target) !== undefined;
}

function readsCurrentUser(controller: object, method: string): boolean {
  const args: unknown = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller.constructor, method);
  return (
    typeof args === 'object' &&
    args !== null &&
    Object.values(args).some((arg) => Reflect.get(arg as object, 'factory') === currentUserFactory)
  );
}

/**
 * Enumerates every route of the Nest application: `METHOD /<prefix>/<controller path>/<handler
 * path>` for every combination of array paths. Throws on `@All()`, which would open every verb.
 */
export function scanRoutes(context: Pick<INestApplicationContext, 'get'>): RouteScan {
  const discovery = context.get(DiscoveryService, { strict: false });
  const scanner = context.get(MetadataScanner, { strict: false });
  const scan: RouteScan = { controllers: [], routes: [] };
  for (const wrapper of discovery.getControllers()) {
    const instance: unknown = wrapper.instance;
    const metatype = wrapper.metatype;
    if (typeof instance !== 'object' || instance === null || typeof metatype !== 'function') {
      continue;
    }
    const controller: FoundController = {
      name: metatype.name,
      isPublic: hasMetadata(AUTH_METADATA_KEY.Public, metatype),
      isOptional: hasMetadata(AUTH_METADATA_KEY.Optional, metatype),
    };
    scan.controllers.push(controller);
    const basePaths = pathsOf(Reflect.getMetadata(PATH_METADATA, metatype));
    for (const name of scanner.getAllMethodNames(Object.getPrototypeOf(instance))) {
      const handler: unknown = Reflect.get(instance, name);
      if (typeof handler !== 'function') continue;
      const verb: unknown = Reflect.getMetadata(METHOD_METADATA, handler);
      if (typeof verb !== 'number') continue;
      if (verb === RequestMethod.ALL) {
        throw new Error(`${metatype.name}.${name} uses @All(): declare each verb on its own`);
      }
      const handlerPaths = pathsOf(Reflect.getMetadata(PATH_METADATA, handler));
      for (const base of basePaths) {
        for (const own of handlerPaths) {
          const route: FoundRoute = {
            key: `${RequestMethod[verb]} ${joinPath(API_GLOBAL_PREFIX, base, own)}`,
            isPublic: hasMetadata(AUTH_METADATA_KEY.Public, handler),
            optional: hasMetadata(AUTH_METADATA_KEY.Optional, handler),
            usesCurrentUser: readsCurrentUser(instance, name),
          };
          scan.routes.push(route);
        }
      }
    }
  }
  return scan;
}

/**
 * The ways a scan can break the rules of ADR 0029, as `tag: subject` strings (empty when clean):
 * `public-mismatch` (public set differs from `PUBLIC_ROUTES`), `public-class`, `optional-class`,
 * `optional-route`, `current-user-on-public`, `empty-reason`, `no-routes`.
 */
export function findRouteViolations(scan: RouteScan): string[] {
  const violations: string[] = [];
  if (scan.routes.length === 0) violations.push('no-routes: nothing found');
  const open = scan.routes.filter((r) => r.isPublic).map((r) => r.key);
  const listed = PUBLIC_ROUTES.map((r) => `${r.method} ${r.path}`);
  for (const key of open) if (!listed.includes(key)) violations.push(`public-mismatch: ${key}`);
  for (const key of listed) if (!open.includes(key)) violations.push(`public-mismatch: ${key}`);
  for (const entry of PUBLIC_ROUTES) {
    if (entry.reason.trim() === '') violations.push(`empty-reason: ${entry.path}`);
  }
  for (const c of scan.controllers) {
    if (c.isPublic) violations.push(`public-class: ${c.name}`);
    if (c.isOptional) violations.push(`optional-class: ${c.name}`);
  }
  for (const r of scan.routes) {
    if (r.optional) violations.push(`optional-route: ${r.key}`);
    if (r.isPublic && r.usesCurrentUser) violations.push(`current-user-on-public: ${r.key}`);
  }
  return violations;
}

/** `METHOD /path` of every route Express serves for Nest (not Swagger and not the auth mount). */
export function expressRouteKeys(app: { getHttpAdapter(): { getInstance(): unknown } }): string[] {
  const instance = app.getHttpAdapter().getInstance();
  const router: unknown = Reflect.get(instance as object, 'router');
  const stack: unknown = router && Reflect.get(router as object, 'stack');
  if (!Array.isArray(stack)) throw new Error('Cannot read the Express router stack');
  const verbs = ['get', 'post', 'put', 'patch', 'delete'];
  const keys: string[] = [];
  const expected = [...EXPECTED_ALL_VERB_MOUNTS];
  for (const layer of stack) {
    const route: unknown = Reflect.get(layer as object, 'route');
    if (typeof route !== 'object' || route === null) continue;
    const path: unknown = Reflect.get(route, 'path');
    const methods: unknown = Reflect.get(route, 'methods');
    if (typeof path !== 'string' || typeof methods !== 'object' || methods === null) continue;
    if (path.startsWith(`/${API_GLOBAL_PREFIX}/docs`)) continue;
    const served = verbs.filter((verb) => Reflect.get(methods, verb) === true);
    // Better Auth's mount (every verb, outside Nest's router): only the expected layers, each once.
    if (served.length === verbs.length && Object.keys(methods).length > verbs.length) {
      const index = expected.indexOf(path);
      if (index === -1) {
        keys.push(`ALL ${path}`);
      } else {
        expected.splice(index, 1);
      }
      continue;
    }
    for (const verb of served) keys.push(`${verb.toUpperCase()} ${path}`);
  }
  return keys;
}
