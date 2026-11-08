/** Decides whether the fetcher may connect to an IP address. */
export type AddressPolicy = (address: string) => boolean;
