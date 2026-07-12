# Spec/plan review

Specs and plans are **review artifacts**. Before either publishes to the tracker as issues, it is staged as a file and reviewed as a git pull request. This is the one gate that keeps unreviewed tickets off the tracker.

It is **not** a planning flow and **not** attached to grilling or wayfinder. It attaches to two artifact types only — a **spec** (from `/to-spec`) and a **plan** / ticket set (from `/to-tickets`) — however they were produced.

## The requirement

- **A spec** (`/to-spec`) is written to `docs/spec/<name>/spec.md`, opened as a PR against `develop` (draft per the repo PR convention, marked ready when set), reviewed, and merged. Only then is the spec published as its issue. If it came from a wayfinder map, the spec reads the map and links back to it.
- **A plan** (`/to-tickets`) is drafted as local files under `docs/spec/<name>/` — one kebab-named file per proposed ticket — opened as a PR, reviewed, and merged. Only then are the tickets created on the tracker, each with `Parent` = the spec issue.
- The staged files under `docs/spec/<name>/` are **temporary** — they exist for review and are deleted once the issues exist. The spec and its tickets are the durable home.

## What is *not* gated

- **Wayfinder investigation tickets** — reviewed continuously on the tracker as each resolves; they don't pass through this gate.
- **A trivial one-liner** with no spec and no ticket set — nothing to review; `/implement` in place at the author's discretion.

## Why

Two reasons, both about handoff. First, a plan people can see and comment on as a diff before it fans out into issues. Second — and this is the load-bearing one — **no unreviewed tickets spam the tracker**: an implementation ticket only exists once its slicing was approved.

Issues carry the `ai-workflow` label when the subject is the AI dev workflow itself. See `issue-tracker.md` for the label palette and `glossary.md` for the terms.
