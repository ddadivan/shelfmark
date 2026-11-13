/** The parts of the generated `ngsw.json` the config checks read. */
export interface NgswManifest {
  readonly dataGroups: readonly unknown[];
  readonly navigationUrls: readonly { readonly positive: boolean; readonly regex: string }[];
  readonly assetGroups: readonly { readonly urls: readonly string[] }[];
}
