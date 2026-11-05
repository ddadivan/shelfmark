# 0004. Strict TypeScript and one type per file

- Status: Accepted
- Date: 2026-11-04
- Source: `docs/PROJECT.md` 5.0 "TypeScript rules"

## Context

The author requires the whole stack to be strictly typed and type definitions to be easy to find. Agents tend to reach for `any` and to collect types in dump files such as `types.ts`.

## Decision

- `strict` and the extra checks in `tsconfig.base.json` are never turned off.
- **No `any`**: neither explicit `any` nor `as any`. Unknown data is `unknown` + narrowing, or a generic.
- **No `@ts-ignore` / `@ts-nocheck`**. `@ts-expect-error` only in tests and only with a description.
- Enforced by root ESLint as errors on `*.ts`: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/ban-ts-comment` (`ts-expect-error: allow-with-description`, min. 10 characters).
- **One type per file**: each interface, type alias, enum and array-of-objects constant in its own file named `<kebab-name>.interface.ts` / `.type.ts` / `.enum.ts` / `.const.ts`, in a `models/` folder next to its users. Types shared by web and api live in `libs/shared/contracts/src/<domain>/`. No dump files (`types.ts`, `models.ts`, `constants.ts`); `index.ts` only re-exports.
- Classes keep the usual `kebab-case.<type>.ts` naming.
- The file split cannot be linted; it is an item in the `code-reviewer` checklist.

## Consequences

- Type errors surface at compile time instead of runtime; no silenced compiler errors.
- More, smaller files; imports are explicit and diffs stay local.
- Recorded in `CLAUDE.md`, the `angular-v22-rules` and `create-api-module` skills and the code-reviewer agent.

## Alternatives considered

- **`any` allowed with a lint warning** — warnings are ignored; the author asked for a hard rule.
- **One `types.ts` per feature** — grows into a dump file; explicitly rejected by the author.
