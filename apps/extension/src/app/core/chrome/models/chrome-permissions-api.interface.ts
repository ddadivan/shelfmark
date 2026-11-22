/** The part of `chrome.permissions` the popup calls: the optional `tabs` permission (#569). */
export interface ChromePermissionsApi {
  contains(permissions: { permissions: string[] }): Promise<boolean>;
  request(permissions: { permissions: string[] }): Promise<boolean>;
}
