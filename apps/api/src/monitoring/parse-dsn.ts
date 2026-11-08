import type { ParsedDsn } from './models/parsed-dsn.interface';

const PROJECT_PATH = /^\/(?:[^/]+\/)*(\d+)\/?$/;

/** Parses a Sentry DSN. Returns `undefined` for anything that is not a well-formed https DSN. */
export function parseDsn(raw: string | undefined): ParsedDsn | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || url.username === '' || url.password !== '') return undefined;
  const projectId = PROJECT_PATH.exec(url.pathname)?.[1];
  if (projectId === undefined || url.search !== '' || url.hash !== '') return undefined;
  return { dsn: url.href, publicKey: url.username, host: url.host, projectId };
}
