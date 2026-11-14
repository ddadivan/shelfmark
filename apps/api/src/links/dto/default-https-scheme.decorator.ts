import { withDefaultScheme } from '@shelfmark/contracts';
import { Transform } from 'class-transformer';

/**
 * Trims a URL field and adds `https://` to a bare host (`example.com`, #405) before validation, so
 * API clients get the same behaviour as the web app. Other schemes pass through unchanged and
 * `IsHttpUrl` still rejects them; the SSRF guard is unchanged.
 */
export const DefaultHttpsScheme = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? withDefaultScheme(value) : value,
  );
