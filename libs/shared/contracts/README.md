# contracts

DTOs, response types and shared constants for web and api (`docs/PROJECT.md` 6).

- One interface / type / `as const` object per file under `src/<domain>/`; `src/index.ts` only re-exports (`export type` for types, `export` for constants). Fixed sets follow ADR 0024.
- Query objects (`ListLinksQuery`, ...) describe the typed result; the API coerces query strings to numbers and booleans.
- `src/testing/` holds mock fixtures for the web (`MOCK_*`, one per file, ids from `MOCK_ID`). Import them only from `@shelfmark/contracts/testing` in specs, stories and dev mocks; never from the main entry or app code.
- The API cannot import runtime constants (`LINK_LIMIT`, `FOLDER_DELETE_MODE`, ...) until its webpack config aliases and bundles this library (ADR 0024); until then it mirrors the values and uses the types.
