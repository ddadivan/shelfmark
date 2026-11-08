/** Resolves a host name to every address it points at (IP literals are returned as they are). */
export type DnsResolver = (hostname: string) => Promise<readonly string[]>;
