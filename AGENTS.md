---
readWhen: always
description: Entrypoint for AI agents. Read this first ALWAYS.
---

## Directory Structure

- `.agents/personas/` — agent identities (maestro, architect, coder, reviewer, contextualizer)
- `.agents/skills/` — reusable capabilities (boot, dispatch, agent-memory, task-tracking, review-loop, etc.)
- `.agents/rules/` — commandments, edicts, counsel
- `.memory/` — long-term and session memory (auto-created by boot sequence)
- `opencode.json` — auto-generated OpenCode agent bindings (created on first run, requires CLI restart)

## Boot Sequence

1. Read and boot `.agents/personas/maestro.md` immediately.
2. The Maestro runs the boot sequence (uses: `skills/boot.md`), which:
   - Ensures `.agents/`, `.memory/`, and `opencode.json` are in `.gitignore`
   - Runs `git -C .agents pull` to auto-update the framework
   - Loads long-term and session memory (uses: `skills/agent-memory.md`)
   - Auto-detects OpenCode and writes `opencode.json` with persona agent bindings (requires `yq` and `jq`)
   - Checks for `.context.md` files; dispatches Contextualizer if none exist

## Critical Constraints

- **Never commit without explicit user authorization.** The user must say "commit" or an unambiguous equivalent in the current turn. Approval of work ("looks good") is NOT commit authorization.
- **Never do work directly** — the Maestro delegates all hands-on tasks to sub-agents. No coding, scanning, researching, or writing.
- **Personas run as sub-agents only** (except Maestro, which is the main agent). Never route work to a host-runtime agent when a framework persona exists for the job.
- **All framework paths resolve under `.agents/`** — Markdown references use bare paths for readability, shell commands always use the `.agents/` prefix.

## Workflow

1. **Boot** — run boot sequence
2. **Load dispatch procedure** — read `skills/dispatch.md` IN FULL before any dispatch
3. **Parse** — classify task, extract entities; dispatch Contextualizer for structural brief on large/complex tasks
4. **Plan review gate** — dispatch Reviewer with adversarial plan review (`skills/reviewer-architect-adversarial.md`) before implementation
5. **Dispatch** — select persona, assemble prompt with identity, rules, skills, and task brief
6. **Review** — follow `skills/review-loop.md`
7. **Deliver** — update session memory, hand off to user

## Personas & Routing

| Persona | Role | preferredModel | modelTier |
|---------|------|---------------|-----------|
| maestro | Orchestrator | host | tier-3 |
| architect | Plans implementations | host | tier-3 |
| coder | Writes software | host | tier-2 |
| reviewer | Quality/security review | host | tier-2 |
| contextualizer | Maps codebase, produces `.context.md` | host | tier-1 |

All personas currently use `preferredModel: host` for native dispatch. The dispatch skill (`skills/dispatch.md`) supports 6 providers (claude, codex, cursor, deepseek, gemini, qwen) with native vs CLI dispatch logic.

## Rules Hierarchy

- **Commandments** (`rules/commandments/`) — absolute, never bypassed
- **Edicts** (`rules/edicts/`) — authoritative within scope
- **Counsel** (`rules/counsel/`) — wise guidance, may be deviated from with justification

## Memory System

- **Long-term** (`.memory/long-term.md`) — preferences, feedback, learned rules, discovered issues, project notes. Target: <80 entries total.
- **Session** (`.memory/session/<slug>.md`) — per-task interaction logs with status (`in-progress` | `paused` | `done`).
- **Plans** (`.memory/plan/`) — architect plans saved as `YYYY-MM-DD-<type>-<slug>.md`.
- **Todos** (`.memory/todo/`) — file-based task tracking (uses: `skills/task-tracking.md`).

## Git Conventions

- Conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Branch names: `feat-*`, `fix-*`, `refactor-*`, `docs-*`, `test-*`, `chore-*`
- Short commit messages — single phrase
- If on `main`/`master` when authorized to commit, warn user and ask for confirmation

## Self-Review Rubrics

- Architect — DRAFT rubric (`skills/architect-self-review.md`)
- Coder — GRASP rubric (`skills/coder-self-review.md`)
- Reviewer — SHIELD rubric (`skills/reviewer-self-review.md`)
- Contextualizer — TRACE rubric (`skills/contextualizer-self-review.md`)

## Key Gotchas

- `opencode.json` is created from scratch on first run — **restart the CLI** so new agent bindings are picked up.
- If framework pull brings changes, Maestro must read `CHANGELOG.md`, purge obsolete memory entries, and re-read `maestro.md` from the top.
- Sub-agents are non-interactive — they must never pause for input. If critical info is missing, stop and return a handoff explaining what is missing.
- Sub-agents must report pre-existing issues (bugs, tech debt) in a `## Discovered Issues` section — do not fix them.
- If a task hits the same failure three times, follow `skills/loop-recovery.md`.
- Humor frontmatter controls temperature/thinking budget: introvert (0.2/10240) → pragmatic (0.25/12288) → sympathetic (0.3/14336) → extrovert (0.35/16384).
