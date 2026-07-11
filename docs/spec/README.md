# docs/spec/

Staging area for the **spec/plan review** gate (`docs/agents/spec-review.md`).

Each in-review effort gets a folder `docs/spec/<name>/` holding:

- `spec.md` — the spec drafted by `/to-spec`, reviewed as a PR before it publishes as an issue.
- one kebab-named file per proposed ticket — drafted by `/to-tickets`, reviewed as a PR before the tickets publish.

These files are **temporary**: they exist for review and are deleted once the corresponding issues exist on the tracker. The tracker issues are the durable home. Persistent docs (ADRs, `CONTEXT.md`) do not live here.
