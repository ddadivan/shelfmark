import { EXTENSION_BROWSER_BRAND } from './models/extension-browser-brand.const';
import { OTHER_CHROMIUM_BRAND } from './models/other-chromium-brand.const';
import type { BrowserIdentity } from './models/browser-identity.interface';

const ANDROID_PLATFORM = 'Android';
const SUPPORTED_BRANDS: ReadonlySet<string> = new Set(Object.values(EXTENSION_BROWSER_BRAND));
const OTHER_BRANDS: ReadonlySet<string> = new Set(Object.values(OTHER_CHROMIUM_BRAND));

/** Desktop Chrome, Edge (`Edg/`), Brave and Arc all carry `Chrome/<version>`. */
const CHROMIUM_UA = /\b(?:Chrome|Edg)\/\d+/;
/**
 * Phones and tablets (`Android`, `Mobile`), iOS shells (`CriOS`, `EdgiOS`: WebKit, no
 * extensions), Opera (`OPR/`) and Samsung Internet. Firefox and Safari have no `Chrome/`.
 */
const NO_EXTENSION_UA = /Android|Mobile|CriOS|EdgiOS|OPR\/|SamsungBrowser/;

/**
 * True for a desktop browser that installs the extension from the Chrome Web Store: Chrome,
 * Edge, Brave, Arc (#455). Reads `userAgentData` brands when the browser has them and falls back
 * to the user-agent string. Whether the window is desktop-wide is `ViewportService`'s business.
 */
export function isExtensionBrowser(identity: BrowserIdentity | undefined): boolean {
  if (!identity) {
    return false;
  }
  const data = identity.userAgentData;
  if (data && data.brands.length > 0) {
    if (data.mobile || data.platform === ANDROID_PLATFORM) {
      return false;
    }
    const names = data.brands.map((entry) => entry.brand);
    return (
      !names.some((name) => OTHER_BRANDS.has(name)) &&
      names.some((name) => SUPPORTED_BRANDS.has(name))
    );
  }
  const userAgent = identity.userAgent;
  return CHROMIUM_UA.test(userAgent) && !NO_EXTENSION_UA.test(userAgent);
}
