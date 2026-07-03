# Planning artifacts (temporary)

One folder per planning ticket, named for its branch (`<issue>-<kebab-title>`). It temporarily holds a planning-pipeline session's PRD (and any notes) so the plan is reviewable in the draft PR. After merge the PRD graduates to a GitHub issue plus implementation tickets, and the folder is deleted — the PRD's durable home is the tracker, not docs.

```
docs/planning/
└── 668-build-planning-pipeline/
    └── prd.md
```

ADRs do not live here — they go in docs/adr/. Glossary updates go in the root CONTEXT.md. See docs/agents/planning-pipeline.md for the full flow and ADR 0003 for the decision.

prd.md follows the template in the to-prd skill (.claude/skills/to-prd/SKILL.md).
