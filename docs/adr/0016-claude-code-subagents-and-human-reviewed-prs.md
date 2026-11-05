# 0016. Claude Code subagents with human-reviewed PRs

- Status: Accepted
- Date: 2026-11-05
- Source: `docs/PROJECT.md` 8, 9.3, 9.6; root `CLAUDE.md`

## Context

Code is written by Claude Code, while the author is the product owner and the only one who approves changes. Work is limited by the Claude subscription (Pro first) and may be interrupted at any time, so state must survive outside the chat. Security (5.8) must be checked on every change.

## Decision

- **Team**: the main Claude Code session is the tech lead and the only dispatcher; 8 subagents in `.claude/agents/`: `project-manager`, `architect`, `frontend-dev`, `ui-dev`, `backend-dev`, `test-engineer`, `code-reviewer`, `security-reviewer`, each with a limited area (8.1). Subagents cannot call each other; blocked agents finish what they can and report to the tech lead.
- **Task flow** (8.2): issue on GitHub Projects → In progress → `architect` plan (larger tasks) → dev agent on its own branch → `test-engineer` → `code-reviewer` + `security-reviewer` → tech lead opens the PR → **the author reviews and merges**. Agents never merge.
- **Git** (9.3): `main` protected, PRs only, green CI required, 0 required approvals (GitHub does not allow approving one's own PR; the author's merge is the approval), squash merge only; one branch per issue; Conventional Commits; `Closes #N`.
- **Parallel work**: independent tasks in separate git worktrees; on Pro at most 1–2 agents at a time.
- **Resumability**: small commits pushed after every step; a "Done / Left / Next step" comment on the issue at pauses; `docs/PROJECT.md` is the source of truth in the repo.
- **Guardrails**: `CLAUDE.md` per project, skills in `.claude/skills/`, hooks and permissions (no `.env*` access, dangerous commands blocked, secret scan before commit), MCP servers (Angular CLI, GitHub, Playwright, Nx).
- **Agent Teams** (experimental): used selectively for large-PR reviews and 1–2 front+back features, to compare with subagents.
- Contract first: `architect` writes `libs/shared/contracts` (and an ADR if significant) before code.

## Consequences

- Every change gets automated review and an explicit human merge; nothing reaches `main` without the author.
- The review step is the bottleneck of the schedule (9.1); subscription limits can stretch timelines (9.6).

## Alternatives considered

- **Agent Teams as the main mode** — burns tokens several times faster; kept experimental (8.3).
- **Required approvals on `main`** — impossible for PRs opened from the author's own account (9.3).
