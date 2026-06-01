---
name: update-pr
description: Update the current branch's PR description to reflect the latest changes
allowed-tools: Bash(git:*), Bash(gh pr view:*), Bash(gh pr edit:*)
---

## Your task

Update the PR description for the current branch to accurately reflect the current state of the changes. Run each step in order. Stop and report if any step fails.

### 1. Identify the PR

```bash
gh pr view --json number,title,body,baseRefName,headRefName
```
If no PR exists for the current branch, stop and tell the user to open one first (or suggest running `/open-pr`).

### 2. Gather current changes

```bash
git log --oneline develop..HEAD
git diff develop..HEAD --stat
```

Read the full diff to understand what changed:
```bash
git diff develop..HEAD
```

### 3. Rewrite the PR description

Use `.github/pull_request_template.md` as the base structure.

Fill in sections from the diff. **Before rewriting, carefully read the existing PR body** to identify content that should be preserved:

**Screenshot rule (CRITICAL):**
- Only `user-attachments/assets/...` URLs (drag-and-dropped by the user via the GitHub web UI) belong in the Screenshots section
- Parse the existing body for any `<img>` tags or `![...]()` image markdown that contain GitHub-hosted URLs — **always preserve them in place** with their exact URLs, alt text, and surrounding headers/captions
- Only remove a user-attachments screenshot if the feature it depicts has been removed from the PR
- **Never** commit screenshots to the repo or write any committed image path, `raw.githubusercontent.com` URL, SHA-pinned raw URL, or local file path into the Screenshots section
- If new screenshots are needed for new features, add a `_screenshot pending_` placeholder alongside any preserved ones — do not link to local files
- After updating the PR, if new screenshots were captured locally under `pictures/<branch>/`, report the full paths to the user and remind them to drag-drop the relevant ones into the PR body via the GitHub web UI themselves

**General preservation rules:**
- Preserve any manually-written context from the existing body that is still accurate — only update what has changed or is stale
- When existing content conflicts with the current diff, default to what the diff shows
- Add new bullet points for new changes, remove bullets for reverted changes
- Preserve any `Closes #...` or `Fixes #...` references from the existing body

**Redundancy rule:**
- Remove bullet points that describe things that are standard practice / always true for this project (e.g., "uses external templateUrl" when inline templates are never used, "uses OnPush" when that's the default convention)
- Only mention something if it's notable, unusual, or a deliberate deviation from the norm
- If a bullet point would make a reviewer think "obviously, why is this mentioned?" — cut it
- If a bullet would just restate something already in the prose, cut it. Bullets must add information the prose doesn't already cover.

**PR style for this repo:**
- Changes section: precise and dense. Aim for 1–3 short sentences that tell a reviewer exactly what landed and the key design decision. Bullets are optional and only earn their place if they add new information (a second concrete change, a non-obvious file, a tradeoff). Don't pad with bullets just to fill the section.
- No filler in Changes: skip "this is a building block for X", "lays the groundwork for Y", or future-facing motivation — that belongs in Notes if it matters at all. Skip "when on… when off…" narration; state the behavior directly. Skip aspirational marketing ("polished", "robust", "comprehensive").
- Tone: casual and technical, direct — no filler or formality
- Test Cases: short abstract descriptions of what was tested, not CLI commands or screenshots
- Notes section: use for caveats, edge cases, architectural context, or future direction that would otherwise bloat Changes — omit if nothing to note
- Remove unused template sections (Screenshots, To Do) rather than leaving placeholders
- Always fill in Changes and Checklist sections with real content
- End with `Closes #<issue>` on its own line (extract ticket number from branch name or commits)
- Mark Checklist items with [x] for completed items

**Example Changes section (good — precise):**
> Adds a Flat toggle to the graph sidebar topic tree (desktop + mobile) that swaps the nested tree for an alphabetical flat list of leaves. Labels show the full path when it fits a 30-char budget, otherwise compact to firstSegment...tail. Selection state is preserved across toggles.

**Example Changes section (bad — verbose, redundant bullets, filler):**
> Adds a Flat toggle to the graph sidebar topic tree (desktop and mobile). When on, the tree renders as a flat alphabetical list of leaves; when off, it returns to the nested tree with selection state preserved across the toggle. This is a building block for selected-topics-only views.
>
> - New flattenTreeNodes + compactTopicLabel helpers in src/utils/tree.utils.ts
> - Toggle UI (PrimeNG ToggleSwitch) wired into the desktop and mobile sidebar headers
> - Flat labels show the full path when it fits (default 30-char threshold) and otherwise compact to firstSegment...tail, keeping as much of the tail as fits

The bad version repeats the same information in prose and bullets, narrates the toggle behavior instead of stating it, and pre-pitches a future feature in Changes.

**Writing shape (borrowed from Matt's writing-shape skill):**
- Pick the format that fits the content: prose for narrative or rationale, a bulleted list only for genuinely parallel items, a table when comparing across two or more dimensions, a callout (blockquote) for a single warning or caveat. Default to prose; reach for the others only when the content's shape calls for it.
- Reader filter: before keeping any paragraph or bullet, ask what it does for the reviewer. If the answer is nothing they can act on or learn from, cut it. Same earn-its-place test as the Changes guidance above, run as one deliberate pass over the finished body.

**Backtick rule:** Max 3 backtick usages in the entire PR description. You can reference files, functions, and identifiers without backticks — only use them for commands worth copy-pasting.

### 4. Update the PR

Write the new body to `/tmp/<branch-name>-pr-body.md`, where `<branch-name>` is the current git branch (`git branch --show-current`). Using a branch-specific filename avoids stale content from previous PRs leaking in.

```bash
gh pr edit --body-file "/tmp/$(git branch --show-current)-pr-body.md"
```

Report what was updated, including a summary of what changed in the description.
