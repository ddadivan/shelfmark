export interface VercelHeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}
