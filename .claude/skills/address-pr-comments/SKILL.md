---
name: address-pr-comments
description: Fetch review comments on the current branch's PR, judge whether each (including outdated ones) still applies, and walk through fixes
allowed-tools: Bash(git:*), Bash(gh pr:*), Bash(gh api:*), Bash(gh repo view:*), Bash(.claude/skills/address-pr-comments/scripts/fetch-review-threads.sh:*)
user-invocable: true
---

## Your task

Walk through unresolved review feedback on the current branch's PR. For every comment — including ones GitHub has marked outdated — judge whether the underlying concern still applies to the current code, then propose and implement fixes. **Do not reply to comment threads.** The user will handle replies manually.

Run each step in order. Stop and report if any step fails.

### 1. Identify the PR and fetch all feedback

Pick the tool once with `gh auth status`, then fetch the PR plus all three comment surfaces — line-level threads, conversation comments, and review summaries (reviewers use all three and they don't overlap).

**`gh` available and authenticated** — run the bundled script for the threads (it exposes the `isResolved`/`isOutdated` state the REST endpoints don't), then the two surfaces it doesn't cover:

```bash
gh pr view --json number,title,headRefName,baseRefName              # identify PR; stop if none exists
.claude/skills/address-pr-comments/scripts/fetch-review-threads.sh  # review threads + resolved/outdated state
gh api "repos/{owner}/{repo}/issues/<PR_NUMBER>/comments" --paginate # conversation comments
gh api "repos/{owner}/{repo}/pulls/<PR_NUMBER>/reviews"   --paginate # review summaries
```

Derive `{owner}/{repo}` from `gh repo view --json nameWithOwner -q .nameWithOwner`.

**`gh` missing or unauthenticated** — use the GitHub MCP server instead, all via `pull_request_read`: `method: get` to identify the PR, `get_review_comments` for the threads (same `is_resolved`/`is_outdated` state, so no script needed), `get_comments` for conversation comments, and `get_reviews` for review summaries.

Either path yields review threads carrying `isResolved`/`isOutdated` plus each comment's `body`, `path`, `line`/`originalLine`, `diffHunk`, and `author`. An outdated thread (`isOutdated: true`) is no longer anchored to a current line, but the concern may still apply (see step 3).

### 2. Filter to unresolved, unique threads

- Collapse reply chains by `in_reply_to_id` — keep the whole chain together and treat the latest message as the current state of the thread.
- Drop threads that have been resolved (use the `isResolved` field from the step 1 output) — it's the authoritative source.
- Skip bot comments (dependabot, codecov, etc.) unless they flag something a human should act on.
- Deduplicate comments that overlap with the Phase 1/2/3 review findings you already fixed — if a fix is already in the latest commit, note it as already-addressed and move on.

### 3. Understand outdated comments (CRITICAL)

An **outdated** comment is one whose original line no longer exists at the same position in HEAD — usually because the code around it was rewritten, reformatted, or moved. GitHub hides these behind a "show outdated" toggle, but **the reviewer's concern may still apply**. Do not auto-dismiss them.

For every outdated comment, do this analysis:

1. **Read the `diff_hunk`** — that's the exact code context the reviewer saw. It shows the lines immediately around the comment.
2. **Search the current working tree** for the code the reviewer referenced. Use content-based search (Grep for a function name, variable, specific expression from the hunk), NOT line numbers. The code may have moved files.
3. **Compare what the reviewer said to the current code** and classify the comment into one of:
   - **Already addressed** — the specific change the reviewer wanted is present in HEAD. Mark it done, move on.
   - **Still applies, same location** — the code exists nearby, reviewer's concern is still valid. Fix it.
   - **Still applies, moved** — the same pattern exists elsewhere in the diff. Fix it at the new location.
   - **Obsoleted by a larger rewrite** — the code the reviewer commented on no longer exists and the replacement doesn't have the same issue. Mark it done with a brief note.
   - **Unclear** — can't tell without more context. Flag for the user to decide.

State your classification explicitly for each outdated comment before proposing a fix. Do not silently skip outdated comments.

### 4. Present the comment list

Before making any changes, show the user a structured summary:

- Group comments by `path`, then by reviewer
- For each comment: quote the body (1-2 line excerpt is fine), show your classification, and propose the fix you'd make
- Ask the user to confirm, skip, or modify each proposed fix before you edit code

Use this format:

```
<file>:<line> — <reviewer>
Comment: "<excerpt from body>"
Status: <active | outdated>
Classification: <one of the 5 above>
Proposed fix: <what you'd change>
```

If there are many comments (>8), ask the user whether they want to go one-by-one or have you implement all the clearly-valid ones in a batch and only interrupt on unclear ones.

### 5. Apply fixes

Make the code changes. Commit at logical boundaries (not one commit per comment — group related fixes). Use the repo's commit convention (`/commit` skill).

**Comment asks to file a follow-up ticket?** Search the tracker first (`gh issue list --search "<keywords>"`) and reuse any match — never open a duplicate.

**Do not post replies to any comment thread.** The user will reply manually after reviewing your fixes. Your job ends at the code change + commit.

### 6. Report

List the comments addressed (with file:line and one-line summary of the fix), the ones you classified as already-addressed or obsoleted (with reasoning), and any you flagged as unclear. Include the commit SHAs so the user can reference them in their manual replies.
