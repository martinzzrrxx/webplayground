# Agent Rules

This repository follows a small-step repair workflow.

## Change Limits

- Keep each code change small and focused.
- Do not make a single patch larger than 50 changed lines without user confirmation first.
- If a fix is likely to exceed 50 changed lines, stop and propose the plan before editing.

## Repair Workflow

- Prefer the smallest verifiable fix over broad refactors.
- Change one problem at a time.
- Verify the specific fix before moving to the next issue.
- Do not mix layout, behavior, and cleanup changes in one patch unless the user approves it.
- After each modification, build a fresh package so the user can review the current app state.
- After each successful package build, launch the latest packaged app automatically unless the user says not to.
- If packaging fails, stop and report the failure before making more changes.
- Do not change line endings or reformat surrounding lines unless the task explicitly requires it.

## Commit Messages

- Use the format `[Codex] Feature description.`
