---
name: journal
description: Capture rough notes locally with zero ceremony while working. Use when the user wants to jot/park/stash a thought mid-task without derailing ("note to self", "remember to", "journal this"). Capture is local and gitignored — nothing is committed or pushed.
---

# Journal

The **capture** half: local, formless, git-free. A note drops into a gitignored `.journal/` folder. Zero ceremony, nothing to push.

The journal **captures only** here — it never invokes git, GitHub, or any downstream skill. (A later export half will route ripe notes to their permanent home.)

Terms `Journal`, `entry`, and `category` are defined in `docs/agents/glossary.md`.

## Storage

- `.journal/` at the repo root, **gitignored** (kept separate from `.context/`, which holds cloned reference repos).
- **Categories** are subfolders that cluster related entries; **entries** are note files.
- **Loose** entries at the journal root are fine — capture stays frictionless.

## Capture

Run the helper — it creates `.journal/` if needed and writes a timestamped entry:

```
.claude/skills/journal/scripts/capture.sh -c <category> "note text"
```

Omit `-c` for a loose root entry; omit the text to create an empty entry to hand-edit. Capture **never** invokes git, GitHub, or any downstream skill — just write the file and report where it landed.

## Guardrails

- Capture touches nothing but the filesystem under `.journal/`.
- The journal never pushes, opens PRs, or contacts GitHub on its own.
