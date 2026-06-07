---
name: address-pr-comments
description: Fetch review comments on the current branch's PR, judge whether each (including outdated ones) still applies, and walk through fixes
allowed-tools: Bash(git:*), Bash(gh pr:*), Bash(gh api:*), Bash(gh repo view:*), Bash(.claude/skills/address-pr-comments/scripts/fetch-review-threads.sh:*)
user-invocable: true
---

## Your task

Walk through unresolved review feedback on the current branch's PR. For every comment — including ones GitHub has marked outdated — judge whether the underlying concern still applies to the current code, then propose and implement fixes. **Do not reply to comment threads.** The user will handle replies manually.

Run each step in order. Stop and report if any step fails.

### 1. Identify the PR

```bash
gh pr view --json number,title,headRefName,baseRefName
```

If no PR exists for the current branch, stop and tell the user there's nothing to address.

Capture the PR number — you'll need it for every subsequent `gh api` call.

### 2. Fetch all review feedback

Start with the bundled script — it returns every review **thread** with the `isResolved` / `isOutdated` state that the REST endpoints don't expose, so it's the single most reliable source:

```bash
.claude/skills/address-pr-comments/scripts/fetch-review-threads.sh
```

Each node carries `id`, `isResolved`, `isOutdated`, and its comments (`databaseId`, `body`, `path`, `line`, `originalLine`, `diffHunk`, `author.login`) in order. An outdated thread has `isOutdated: true` — GitHub no longer anchors it to a current line, but the concern may still apply (see step 4).

Then pull the two surfaces the thread query doesn't cover — top-level conversation comments and review summaries — since reviewers use them too and they don't overlap with line-level threads:

```bash
# Top-level PR conversation comments ("Conversation" tab)
gh api "repos/{owner}/{repo}/issues/<PR_NUMBER>/comments" --paginate

# Review summaries (approve/request-changes/comment with a top-level body)
gh api "repos/{owner}/{repo}/pulls/<PR_NUMBER>/reviews" --paginate
```

Derive `{owner}/{repo}` from `gh repo view --json nameWithOwner -q .nameWithOwner`.

### 3. Filter to unresolved, unique threads

- Collapse reply chains by `in_reply_to_id` — keep the whole chain together and treat the latest message as the current state of the thread.
- Drop threads that have been resolved (check the `resolved` field on review threads via GraphQL if needed — see fallback below).
- Skip bot comments (dependabot, codecov, etc.) unless they flag something a human should act on.
- Deduplicate comments that overlap with the Phase 1/2/3 review findings you already fixed — if a fix is already in the latest commit, note it as already-addressed and move on.

Resolved/outdated state comes from `isResolved` / `isOutdated` in the step 2 script output — that's the authoritative source. Skip threads with `isResolved: true`.

### 4. Understand outdated comments (CRITICAL)

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

### 5. Present the comment list

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

### 6. Apply fixes

Make the code changes. Commit at logical boundaries (not one commit per comment — group related fixes). Use the repo's commit convention (`/commit` skill).

**Do not post replies to any comment thread.** The user will reply manually after reviewing your fixes. Your job ends at the code change + commit.

### 7. Report

List the comments addressed (with file:line and one-line summary of the fix), the ones you classified as already-addressed or obsoleted (with reasoning), and any you flagged as unclear. Include the commit SHAs so the user can reference them in their manual replies.
