import type { GitHubProfileStub } from './github-profile-stub.interface';
import type { GoogleProfileStub } from './google-profile-stub.interface';

export interface OAuthProviderStubOptions {
  github?: GitHubProfileStub;
  google?: GoogleProfileStub;
  /** Makes both token endpoints answer with this status and an error body (default: succeed). */
  tokenEndpointStatus?: number;
}
