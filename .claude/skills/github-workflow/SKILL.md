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

`0 · Foundation`, `1 · Design system`, `2 · Authorisation`, `3 · Links`, `4 · Folders and tags`, `5 · Search and feed`, `6 · Polish`, `7 · Release` (PROJECT.md 9.1).

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

Statuses: **Backlog → Todo → In progress → In review → Done**.

```bash
gh project list --owner ddadivan                                  # find project number
gh project item-add <P> --owner ddadivan --url <issue-url>        # add issue
gh project field-list <P> --owner ddadivan --format json          # Status field id + option ids
gh project item-list <P> --owner ddadivan --format json           # item ids
gh project item-edit --project-id <PROJECT_NODE_ID> --id <ITEM_ID> \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <OPTION_ID>
```

| Event                   | Status                                          |
| ----------------------- | ----------------------------------------------- |
| Issue created and ready | Todo (future stages: Backlog)                   |
| Tech lead starts work   | In progress                                     |
| PR opened               | In review                                       |
| PR merged               | Done (the board workflow also does it on close) |

## Branches and commits

- One branch per issue from fresh `main`: `feat/<N>-short-name`, `fix/<N>-…`, `chore/<N>-…`, `docs/<N>-…`, `ci/<N>-…`, `test/<N>-…`.
- Never commit or push to `main`; never force-push shared branches (`--force-with-lease` on your own branch only after a rebase).
- Conventional Commits: `type(scope): imperative summary` (≤ 72 chars), scope = project or area (`web`, `api`, `ui`, `contracts`, `claude`, `ci`). Small commits after every finished step; push right away.
- End every commit message with:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```

## Pull requests

- One PR = one logical change = one issue. Body follows `.github/pull_request_template.md`: What, `Closes #N`, How to verify, checklist.
- Labels and milestone copied from the issue.
- PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Write issue / PR / comment bodies to a file with the Write tool and pass `-F <file>`. The guard hook scans Bash command text, so a heredoc that mentions env file names gets blocked.

```bash
gh pr create -B main -t "feat(api): links CRUD" -F pr.md -l "type:feat,area:api" -m "3 · Links"
gh pr checks <N> --watch
```

The author reviews and merges (squash). Agents never merge, approve, or change branch protection.

## Progress comment (end of session / pause)

```bash
gh issue comment <N> -R ddadivan/shelfmark -b $'**Done:** …\n**Left:** …\n**Next step:** …'
```
