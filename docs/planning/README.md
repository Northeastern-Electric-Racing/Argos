# Planning artifacts (temporary)

One folder per PRD, named for it (`<issue>-<kebab-title>`, the same slug as the planning ticket and branch). It temporarily holds the PRD and, under a `tickets/` subfolder, the drafted implementation tickets, so they're reviewable in a draft PR. Once the PRD is published as an issue and its child tickets are created, the folder is deleted (phase 3) — their durable home is the tracker, not docs.

```
docs/planning/
└── <issue>-<kebab-title>/        # named for the PRD; created during a planning session, deleted in phase 3
    ├── prd.md
    └── tickets/                  # drafted implementation tickets (phase 2)
        └── <slice>.md
```

ADRs do not live here — they go in docs/adr/. Glossary updates go in the root CONTEXT.md. See docs/agents/planning-pipeline.md for the full flow and ADR 0003 for the decision.

prd.md follows the template in the to-prd skill (.claude/skills/to-prd/SKILL.md); the files under tickets/ follow the issue template in the to-issues skill.
