# Planning artifacts (temporary)

One folder per planning ticket, named for it (`<issue>-<kebab-title>`, the same slug as the branch — the PRD issue doesn't exist yet when the folder is created). It temporarily holds the PRD plus the drafted implementation tickets — one kebab-named file per proposed ticket — so they're reviewable in a draft PR. Once the PRD is published as an issue and its child tickets are created, the folder is deleted (phase 3) — their durable home is the tracker, not docs.

```
docs/prd/
└── <issue>-<kebab-title>/           # named for the planning ticket; created during a planning session, deleted in phase 3
    ├── prd.md
    └── <ticket-proposed-kebab>.md   # one file per proposed implementation ticket (phase 2)
```

ADRs do not live here — they go in docs/adr/. Glossary updates go in the root CONTEXT.md. See docs/agents/planning-pipeline.md for the full flow and ADR 0003 for the decision.

prd.md follows the template in the to-prd skill (.claude/skills/to-prd/SKILL.md); each proposed-ticket file follows the issue template in the to-issues skill.
