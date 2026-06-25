# Research artifacts

One folder per research ticket, named for its branch (`<issue>-<kebab-title>`). Each holds the committed output of a research-pipeline session — the PRD and any grilling notes — reviewed as a draft PR before implementation issues are broken out.

```
docs/research/
└── 668-build-research-pipeline/
    └── prd.md
```

ADRs do not live here — they go in docs/adr/. Glossary updates go in the root CONTEXT.md. See docs/agents/research-pipeline.md for the full flow and ADR 0003 for the decision.

prd.md follows the template in the to-prd skill (.claude/skills/to-prd/SKILL.md).
