---
name: open-pr
description: Run pre-PR checks, push the branch, and open a pull request
allowed-tools: Bash(git:*), Bash(gh pr create:*), Bash(npx prettier:*), Bash(npx ng lint:*), Bash(npx eslint:*)
user-invocable: true
---

## Your task

Run each step in order. Stop and report if any step fails.

### 1. Verify commit format
```bash
git log --oneline develop..HEAD
```
Confirm all commits match `#{ticket_number} {2-8 word description}` (e.g., `#501 Add endpoint for client rules`). Flag any that don't.

### 2. Lint and test
```bash
cd "$(git rev-parse --show-toplevel)/angular-client" && npx prettier --check "src/**/*.{ts,html,scss}" && npx ng lint
```
If there are frontend changes. Skip if the diff only touches `scylla-server/`.

**Why the absolute cd:** the Bash tool persists cwd across calls, so a bare `cd angular-client` errors on the second run when you're already inside. Resolving from `git rev-parse --show-toplevel` makes it idempotent regardless of where the prior command left you.

### 3. Conflict check
```bash
git fetch origin develop
git merge --no-commit --no-ff origin/develop || true
git merge --abort 2>/dev/null || true
```
Note: "Already up to date" returns a non-zero exit code but is not a failure. Only stop if there are actual merge conflicts in the output.

### 4. Write PR body

Use `.github/pull_request_template.md` as the base. Fill in sections from the diff.

**PR style for this repo:**
- Changes section: precise and dense. Aim for 1–3 short sentences that tell a reviewer exactly what landed and the key design decision. Bullets are optional and only earn their place if they add information the prose doesn't already cover (a second concrete change, a non-obvious file, a tradeoff). If your bullets would just restate the prose in list form, drop them.
- No filler in Changes: skip "this is a building block for X", "lays the groundwork for Y", or future-facing motivation — that goes in Notes if it matters at all. Skip "when on… when off…" narration; state the behavior directly. Skip aspirational marketing ("polished", "robust", "comprehensive").
- Tone: casual but technical — describe what was done and the why behind a non-obvious choice, not how it was implemented step by step
- Test Cases: brief abstract descriptions of what was tested, not CLI commands
- Remove sections that don't apply (Screenshots if no UI changes, To Do if nothing remaining)
- Keep the Checklist section and check off all applicable items
- Always include `Closes #NNN` at the bottom referencing the GitHub issue
- Notes section: mention anything a reviewer should know — tradeoffs, edge cases, follow-up work, or future-direction context that would otherwise bloat Changes

**Example Changes section (good — precise):**
> Adds a Flat toggle to the graph sidebar topic tree (desktop + mobile) that swaps the nested tree for an alphabetical flat list of leaves. Labels show the full path when it fits a 30-char budget, otherwise compact to firstSegment...tail. Selection state is preserved across toggles.

**Example Changes section (bad — verbose, redundant bullets, filler):**
> Adds a Flat toggle to the graph sidebar topic tree (desktop and mobile). When on, the tree renders as a flat alphabetical list of leaves; when off, it returns to the nested tree with selection state preserved across the toggle. This is a building block for selected-topics-only views.
>
> - New flattenTreeNodes + compactTopicLabel helpers in src/utils/tree.utils.ts
> - Toggle UI (PrimeNG ToggleSwitch) wired into the desktop and mobile sidebar headers
> - Flat labels show the full path when it fits (default 30-char threshold) and otherwise compact to firstSegment...tail, keeping as much of the tail as fits

The bad version repeats the same information in prose and bullets, narrates the toggle behavior instead of stating it, and pre-pitches a future feature in Changes.

**Screenshot rule (CRITICAL):**
- Only `user-attachments/assets/...` URLs (drag-and-dropped by the user via the GitHub web UI) belong in the Screenshots section
- **Never** commit screenshots to the repo or write any committed image path, `raw.githubusercontent.com` URL, SHA-pinned raw URL, or local file path into the Screenshots section
- If UI changes were made, leave the Screenshots section with a `_screenshot pending_` placeholder — do not link to local files
- After opening the PR, if screenshots were captured locally under `pictures/<branch>/`, report the full paths to the user and remind them to drag-drop the relevant ones into the PR body via the GitHub web UI themselves

**Writing shape (borrowed from Matt's writing-shape skill):**
- Pick the format that fits the content: prose for narrative or rationale, a bulleted list only for genuinely parallel items, a table when comparing across two or more dimensions, a callout (blockquote) for a single warning or caveat. Default to prose; reach for the others only when the content's shape calls for it.
- Reader filter: before keeping any paragraph or bullet, ask what it does for the reviewer. If the answer is nothing they can act on or learn from, cut it. Same earn-its-place test as the Changes guidance above, run as one deliberate pass over the finished body.

**Backtick rule:** Max 3 backtick usages in the entire PR description. You can reference files, functions, and identifiers without backticks — only use them for commands worth copy-pasting.

Write the PR body to `/tmp/<branch-name>-pr-body.md`, where `<branch-name>` is the current git branch (`git branch --show-current`). Using a branch-specific filename avoids stale content from previous PRs leaking in.

### 5. Clean working tree

Restore any untracked or modified files that were changed as a side effect of earlier steps (e.g. package-lock.json from npm install during lint). The working tree must be clean before `gh pr create` — it aborts on uncommitted changes.

```bash
git checkout -- . 2>/dev/null || true
```

### 6. Push and open PR

Extract the ticket number from the branch name (e.g., `174-mqtt-screen-mobile-view` → `#174`).

Always use `--head` with the branch name — gh cli can't always detect the remote branch without it.

```bash
git push -u origin $(git branch --show-current)
gh pr create --draft --base develop --head $(git branch --show-current) --title "#{ticket_number} brief title" --body-file "/tmp/$(git branch --show-current)-pr-body.md" --assignee @me
```

Report the PR URL when done.
