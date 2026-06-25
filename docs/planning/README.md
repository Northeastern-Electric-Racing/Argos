# Planning artifacts

One folder per planning ticket, named for its branch (`<issue>-<kebab-title>`). Each holds the committed output of a planning-pipeline session — the PRD and any planning notes — reviewed as a draft PR before implementation issues are broken out.

```
docs/planning/
└── 668-build-planning-pipeline/
    └── prd.md
```

ADRs do not live here — they go in docs/adr/. Glossary updates go in the root CONTEXT.md. See docs/agents/planning-pipeline.md for the full flow and ADR 0003 for the decision.

prd.md follows the template in the to-prd skill (.claude/skills/to-prd/SKILL.md).
