# Spec review

A **spec** is a review artifact. Before it publishes to the tracker as an issue, it is staged as a file and reviewed as a git pull request. This is the one gate that keeps an unreviewed feature direction off the tracker.

It is **not** a planning flow and **not** attached to grilling or wayfinder. It attaches to one artifact type — a **spec** (from `/to-spec`) — however it was produced.

## The requirement

- **A spec** (`/to-spec`) is written to `docs/spec/<name>/spec.md`, opened as a PR against `develop` (draft per the repo PR convention, marked ready when set), reviewed, and merged. Only then is the spec published as its issue. If it came from a wayfinder map, the spec reads the map and links back to it.
- The staged `docs/spec/<name>/spec.md` is **temporary** — it exists for review. Once the spec issue exists, it is removed in a **small follow-up PR against `develop`** (the draft merged to protected `develop`, so the deletion needs its own commit). The spec issue is the durable home.

## What is *not* gated

- **Implementation tickets** (`/to-tickets`) — created directly on the tracker after the skill's interactive quiz, then reviewed and refined as issues. Their slicing is reviewed live, not as a file diff, so they don't pass through this gate. Each links to its spec via `Parent` when one exists, and to its blockers via `Blocked by`.
- **Wayfinder investigation tickets** — reviewed continuously on the tracker as each resolves; they don't pass through this gate either.
- **A trivial one-liner** with no spec — nothing to review; `/implement` in place at the author's discretion.

## Why

A spec is where a feature's direction is decided, so it is the thing worth reviewing as a diff before the team commits to it and before it fans out into implementation tickets. Ticket slicing is still reviewed — interactively in the `to-tickets` quiz and then on the tracker — just not as a staged file, matching how wayfinder tickets are handled.

Issues carry the `ai-workflow` label when the subject is the AI dev workflow itself. See `issue-tracker.md` for the label palette and `glossary.md` for the terms.
