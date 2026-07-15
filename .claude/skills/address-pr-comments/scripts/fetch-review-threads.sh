#!/usr/bin/env bash
# Fetch every review thread on a PR as JSON — the most reliable source for
# resolved/outdated state, which the REST comment endpoints don't expose.
#
# Output: the reviewThreads.nodes array. Each node carries id, isResolved,
# isOutdated, and its comments (databaseId, body, path, line, originalLine,
# diffHunk, author.login) in order.
#
# Usage:
#   fetch-review-threads.sh [PR_NUMBER]
#     PR_NUMBER defaults to the PR for the current branch.
set -euo pipefail

repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
owner="${repo%%/*}"
name="${repo##*/}"
num="${1:-$(gh pr view --json number -q .number)}"

gh api graphql -f query='
query($owner:String!, $repo:String!, $num:Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$num) {
      reviewThreads(first:100) {
        nodes {
          id
          isResolved
          isOutdated
          comments(first:50) {
            nodes { databaseId body path line originalLine diffHunk author { login } }
          }
        }
      }
    }
  }
}' -f owner="$owner" -f repo="$name" -F num="$num" \
  --jq '.data.repository.pullRequest.reviewThreads.nodes'
