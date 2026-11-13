import type { VercelHeaderRule } from './vercel-header-rule.interface';
import type { VercelRewriteRule } from './vercel-rewrite-rule.interface';

export interface VercelConfig {
  buildCommand: string;
  regions: string[];
  git: { deploymentEnabled: Record<string, boolean> };
  rewrites: VercelRewriteRule[];
  headers: VercelHeaderRule[];
}
