# docs/spec/

Staging area for the **spec review** gate (`docs/agents/spec-review.md`).

Each in-review spec gets a folder `docs/spec/<name>/` holding:

- `spec.md` — the spec drafted by `/to-spec`, reviewed as a PR before it publishes as an issue.

This file is **temporary**: it exists for review and is deleted once the spec issue exists on the tracker. The spec issue is the durable home. Implementation tickets (`/to-tickets`) are created directly on the tracker, not staged here. Persistent docs (ADRs, `CONTEXT.md`) do not live here either.
