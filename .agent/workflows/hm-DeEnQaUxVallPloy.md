---
name: hm-DeEnQaUxVallPloy
description: >
  Orchestration skill that runs a full product delivery pipeline in strict sequence:
  hm-designer → hm-engineer → hm-qa → hm-ux-flow → hm-validate-all → hm-deploy.
  All responses use caveman mode (ultra-compressed) to minimize token output.
  Trigger when user says "hm full pipeline", "run DeEnQaUxVallPloy", "full hm flow",
  "pipeline completo", "rodar pipeline hm", "designer engineer qa ux validate deploy",
  or invokes the skill by name "hm-DeEnQaUxVallPloy". When in doubt, trigger.
---

# hm-DeEnQaUxVallPloy — Full Pipeline Orchestrator

Runs 6 hm skills in fixed sequence. All output in caveman mode (full intensity).

## Skill locations

All skills at: `C:\Users\guico\.claude\skills\`

| Step | Dir | Skill |
|------|-----|-------|
| 1 | `hm designer/` | `/hm-designer` — visual + interface validation |
| 2 | `hm engineer/` | `/hm-engineer` — code audit (security, architecture, perf) |
| 3 | `hm qa/` | `/hm-qa` — baseline-ready checks + test gaps |
| 4 | `hm ux flow/` | `/hm-ux-flow` — decision flow + friction audit |
| 5 | `hm validate all/` | `/hm-validate-all` — consolidates all, declares baseline-ready |
| 6 | `hm deploy/` | `/hm-deploy` — deploy gate + security gate final |

**Note:** `/hm-validate-all` already orchestrates security+engineer+qa+designer+deploy internally.
Steps 1–4 run first to give Claude full context before validate-all consolidates.
Step 6 (deploy) runs last as the final ship gate.

## Execution protocol

### PRE-PIPELINE (obrigatório — não pular)

**[0] Read Obsidian Wiki**
Before any skill runs, read the project's wiki in the Obsidian vault.
- Locate the project's note(s) in the vault (ask owner for path if unknown)
- Extract: project goals, current status, recent decisions, known issues, architecture notes
- Use this context to inform all 6 steps — do not run pipeline blind
- Output: `## [0] Wiki Read — [project name]: <summary of what was loaded, caveman>`

### PIPELINE (steps 1–6)

1. Load each skill's SKILL.md before executing that step.
2. Run step fully before advancing.
3. Header per step: `## [N] /hm-<skill-name>`.
4. **Caveman active for all output.** Rules in `caveman/SKILL.md`. Default: **full**.
5. Pass prior output as context to each next step.
6. Do not skip steps.

### POST-PIPELINE (obrigatório — não pular)

**[7] Update Obsidian Wiki**
After all 6 steps complete, update the project's wiki with pipeline results.
Must include:
- Date of pipeline run
- Baseline-ready verdict (from `/hm-validate-all`)
- Key findings per skill (CRITICAL/HIGH only — no noise)
- Deploy status (from `/hm-deploy`)
- Any open blockers or technical debt logged
- Next recommended actions

Format the wiki update as a dated log entry appended to the existing note — do not overwrite history.
Output: `## [7] Wiki Updated — [path]: <what was written, caveman>`

## Output structure

```
## [0] Wiki Read — [project]
<caveman summary of context loaded>

## [1] /hm-designer
<caveman output>

## [2] /hm-engineer
<caveman output>

## [3] /hm-qa
<caveman output>

## [4] /hm-ux-flow
<caveman output>

## [5] /hm-validate-all
<caveman output — includes consolidated baseline-ready verdict>

## [6] /hm-deploy
<caveman output — final ship gate>

## [7] Wiki Updated — [path]
<caveman summary of what was written>
```

## Error handling

- Skill file not found → `MISSING: <skill>`, skip step, continue pipeline.
- Blocking issue (CRITICAL security finding in step 2 or 5) → `BLOCKER: <reason>`, pause, ask owner before continuing.
- Non-blocking → flag `WARN: <issue>` inline, continue.

## Caveman rules (summary)

Drop: articles, filler, pleasantries, hedging. Fragments OK. Short synonyms.
Code blocks: always normal (never compress code).
Switch: `/caveman lite|full|ultra`. Default: full.
Off: `stop caveman` / `normal mode` / `modo normal`.
