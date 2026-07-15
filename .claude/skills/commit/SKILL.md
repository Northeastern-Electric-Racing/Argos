---
name: commit
description: Stage and commit using this repo's commit message convention
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*)
user-invocable: true
---

## Context

Current branch:
`!git branch --show-current`

Git status:
`!git status`

Staged + unstaged diff:
`!git diff HEAD`

Recent commits:
`!git log --oneline -5`

## Task

1. Extract the ticket number from the current branch name using pattern: `{number}-{description}` — the leading number is the GitHub issue (e.g., branch `533-csv-upload-download-rules` → ticket `#533`)
2. Review the diff and stage all relevant changed files (avoid staging unrelated or generated files)
3. Write a commit message in the format: `#{ticket_number} - {concise description of changes}` — example: `#501 - fmt`

   Keep the {concise description} caveman-terse (borrowed from the caveman skill): imperative, drop articles and filler, fragments fine, abbreviate common terms (fmt, refactor, deps, config), aim for 2-8 words. Prefer `#533 - add CSV upload endpoint` over `#533 - this commit adds a new endpoint for uploading CSV files`.
4. Commit in a single operation using a HEREDOC for the message:
   ```bash
   git commit -m "$(cat <<'EOF'
   #NNN - description here
   EOF
   )"
   ```
5. Run `git status` to confirm the commit succeeded
