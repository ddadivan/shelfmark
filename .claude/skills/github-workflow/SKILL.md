---
name: github-workflow
description: How Shelfmark works on GitHub - issue format, labels, milestones, the GitHub Projects board and its statuses, issue dependencies, branch names, Conventional Commits, PR format and progress comments, with exact gh commands. Use when creating or moving issues, branching, committing or opening PRs.
---

# GitHub workflow

Repository: `ddadivan/shelfmark`. Board: GitHub Project **Shelfmark** (number 2, owner `ddadivan`).

## Labels

- Agent: `agent:project-manager`, `agent:architect`, `agent:frontend-dev`, `agent:ui-dev`, `agent:backend-dev`, `agent:test-engineer`, `agent:code-reviewer`, `agent:security-reviewer`
- Type: `type:feat`, `type:fix`, `type:chore`, `type:docs`, `type:test`, `type:ci`
- Priority: `priority:p0` (blocking), `priority:p1`, `priority:p2`
- Area: `area:web`, `area:api`, `area:ui`, `area:contracts`, `area:infra`, `area:claude`
- `blocked` — has an open blocker

## Milestones

Stage 1 (closed): `0 · Foundation`, `1 · Design system`, `2 · Authorisation`, `3 · Links`, `4 · Folders and tags`, `5 · Search and feed`, `6 · Polish`, `7 · Release` (PROJECT.md 9.1). Stage 2: `Stage 2 · Redesign`, `Stage 2 · Features`.

## Issues

Title in Conventional-Commit style: `feat(web): add link dialog with preview`. Body: goal, scope, acceptance criteria (checkboxes, from PROJECT.md 4), reference, agent.

```bash
gh issue create -R ddadivan/shelfmark -t "feat(api): links CRUD" -F body.md \
  -m "3 · Links" -l "type:feat,area:api,priority:p0,agent:backend-dev"
```

Dependencies (blocked by):

```bash
BLOCKER_ID=$(gh api repos/ddadivan/shelfmark/issues/<blocker> --jq .id)
gh api -X POST repos/ddadivan/shelfmark/issues/<issue>/dependencies/blocked_by -F issue_id=$BLOCKER_ID
gh api repos/ddadivan/shelfmark/issues/<issue>/dependencies/blocked_by --jq '.[].number'
```

## Board

Statuses: **Backlog → Todo → In progress → In review → To release → Done** (PROJECT.md 9.3, ADR 0035).

Cloud sessions cannot use GraphQL, so `gh project` commands fail there: list the moves in the final report and the author or a local session makes them.

```bash
gh project list --owner ddadivan                                  # find project number
gh project item-add <P> --owner ddadivan --url <issue-url>        # add issue
gh project field-list <P> --owner ddadivan --format json          # Status field id + option ids
gh project item-list <P> --owner ddadivan --format json           # item ids
gh project item-edit --project-id <PROJECT_NODE_ID> --id <ITEM_ID> \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <OPTION_ID>
```

| Event                    | Status                                                              |
| ------------------------ | ------------------------------------------------------------------- |
| Issue created and ready  | Todo (future stages: Backlog)                                       |
| Tech lead starts work    | In progress                                                         |
| PR opened (into `stage`) | In review                                                           |
| PR merged into `stage`   | To release (board workflow "Pull request merged"); issue stays open |
| Release PR merged        | Done (the release PR closes the issue; workflow "Item closed")      |

## Branches and commits

- `main` is production, `stage` is the integration branch of the current stage (PROJECT.md 9.3, ADR 0035).
- One branch per issue from fresh `stage` (`git fetch origin stage && git switch -c feat/<N>-short origin/stage`): `feat/<N>-short-name`, `fix/<N>-…`, `chore/<N>-…`, `docs/<N>-…`, `ci/<N>-…`, `test/<N>-…`.
- A task that needs another task's unmerged branch starts from that branch; its PR still targets `stage` and says "Merge after #N" at the top.
- To bring a branch up to date, merge `origin/stage` into it. Never rebase or force-push a branch that has a PR.
- Never commit or push to `main` or `stage` (the guard hook blocks both).
- Hotfix for production only: a branch from `main`, a PR into `main`, then `main` is merged back into `stage` through a PR.
- Conventional Commits: `type(scope): imperative summary` (≤ 72 chars), scope = project or area (`web`, `api`, `ui`, `contracts`, `claude`, `ci`). Small commits after every finished step; push right away.
- End every commit message with:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```

## Pull requests

- One PR = one logical change = one issue, into `stage`, squash merge. Body follows `.github/pull_request_template.md`: What, `Refs #N`, How to verify, checklist.
- `Refs #N`, not `Closes #N`: closing keywords only act on the default branch, and the issue stays open until the release.
- **Release PR** `stage → main` at the end of a stage (title "Release: stage N"): lists `Closes #N` for every issue of the stage, merged by the author with a merge commit.
- Labels and milestone copied from the issue.
- PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Write issue / PR / comment bodies to a file with the Write tool and pass `-F <file>`. The guard hook scans Bash command text, so a heredoc that mentions env file names gets blocked.

```bash
gh pr create -B stage -t "feat(api): links CRUD" -F pr.md -l "type:feat,area:api" -m "Stage 2 · Features"
gh pr checks <N> --watch
```

The author reviews and merges (squash into `stage`, merge commit for the release PR into `main`). Agents never merge, approve, or change branch protection.

## Progress comment (end of session / pause)

```bash
gh issue comment <N> -R ddadivan/shelfmark -b $'**Done:** …\n**Left:** …\n**Next step:** …'
```
