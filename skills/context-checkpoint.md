---
shortDescription: Detects approaching context limit, saves session state, and prepares a clean restart prompt.
usedBy: [maestro]
version: 0.1.0
lastUpdated: 2026-03-22
---

## Purpose

Every session has a finite context window. As the window fills, model quality degrades before it is actually exceeded — responses become less coherent, earlier instructions are silently dropped, and reasoning quality falls. This skill defines how the Maestro detects when a session is approaching that threshold and how to save state so the next session can resume without losing continuity.

Target threshold: **60% of the model's context window**. For a 1M-token model, this is ~600K tokens (~2.4 MB of raw conversation text at ~4 chars/token).

## Detection

Check context usage after each major dispatch (any Coder, Architect, or multi-step task). Run both checks — act if **either** triggers.

### Check 1 — Transcript file size

Find and measure the active session transcript:

```bash
# Claude Code
find ~/.claude/projects -name "*.jsonl" -newer /tmp/.harness-session-start \
  2>/dev/null | xargs ls -s 2>/dev/null | sort -n | tail -1 | awk '{print $1}'

# OpenCode
find ~/.opencode/sessions -name "*.json" -newer /tmp/.harness-session-start \
  2>/dev/null | xargs ls -s 2>/dev/null | sort -n | tail -1 | awk '{print $1}'
```

Output is in 512-byte blocks. Threshold: **4800 blocks ≈ 2.4 MB**.

If the transcript file cannot be located (file not found, permissions, different installation path), fall back to Check 2.

### Check 2 — Dispatch counter

The Maestro increments a counter in session memory at each dispatch. When the counter reaches **10 major dispatches**, trigger a checkpoint regardless of transcript size.

Track in session memory as: `DISPATCH_COUNT=<n>` (not persisted to disk — session state only).

## Checkpoint Procedure

When a trigger fires, execute all steps before the next dispatch.

1. **Announce.** Tell the user: "Context is approaching 60% — running checkpoint before continuing."

2. **Flush to-dos.** Write the current task-tracking state to disk:
   ```bash
   # The task-tracking skill manages .agents/tasks/ — just ensure it is flushed and up to date.
   ```
   If any to-do items are `in-progress`, mark them as `paused` with a note: `Paused at checkpoint — resume in next session`.

3. **WIP commit.** If there are uncommitted changes, create a WIP commit (follows: `skills/git-recovery.md` WIP commit procedure). This ensures the next session starts from a clean, recoverable state.

4. **Compact memory.** If `.memory/long-term.md` exceeds 100 lines, run memory compaction now (uses: `skills/memory-compaction.md`). Do not wait for the normal 150-line threshold — the checkpoint is the right time to compact.

5. **Write the checkpoint file.** Create `.memory/checkpoints/<timestamp>-checkpoint.md`:

   ```bash
   TIMESTAMP=$(date +%Y%m%d-%H%M%S)
   mkdir -p .memory/checkpoints
   ```

   File contents:

   ```markdown
   ---
   timestamp: <ISO 8601>
   branch: <git branch>
   dispatch_count: <n>
   context_trigger: size | count | manual
   ---

   ## Active Task

   <One paragraph: what the user asked for, what has been done, what remains.>

   ## Branch and Spec

   - Branch: `<branch>`
   - Spec: `<specs/<id>.json>` (if applicable)
   - Last completed AC: `<ac-id>` — `<description>`
   - Next AC: `<ac-id>` — `<description>`

   ## Key Decisions

   <Bullet list of decisions made this session that the next session must know.>

   ## Discovered Issues

   <Any pre-existing issues surfaced this session. Omit section if none.>

   ## Resume Prompt

   <The exact task brief the Maestro should use to resume. Self-contained — no context from this session is assumed.>
   ```

6. **Update long-term memory.** Append a single entry to `.memory/long-term.md`:

   ```markdown
   ## Session Checkpoint — <YYYYMMDD-HHMMSS>
   Checkpoint at <dispatch_count> dispatches. Trigger: <size|count|manual>.
   Resume from: `.memory/checkpoints/<timestamp>-checkpoint.md`
   Branch: `<branch>`. Last completed: <ac-id>.
   ```

7. **Present the resume prompt.** Print the contents of the `## Resume Prompt` section to the user and instruct them to paste it as the first message in the next session.

## Restart Procedure

### Claude Code

```bash
# End the current session — close the terminal tab or window, or type /exit
# Start a new session in the same project directory:
claude
# Paste the Resume Prompt from the checkpoint file as your first message.
```

### OpenCode

```bash
# Start a new session:
opencode
# Paste the Resume Prompt from the checkpoint file as your first message.
```

The new session will boot normally (follows: `skills/boot.md`), load long-term memory, and find the checkpoint entry. The Maestro will read the checkpoint file and resume from the exact stopping point.

## Resume Procedure (new session)

When the Maestro boots and finds a recent checkpoint (any entry in `.memory/long-term.md` dated within 24 hours), it must:

1. Read the checkpoint file at the path listed in the long-term memory entry.
2. Load the `## Active Task`, `## Key Decisions`, and `## Resume Prompt` sections into active context.
3. Confirm with the user: "Resuming from checkpoint `<timestamp>`. Active task: `<one-line summary>`. Continue?"
4. On confirmation, dispatch from the `## Resume Prompt` without asking the user to re-explain anything.

## Manual Trigger

The user or Maestro may trigger a checkpoint at any time with the instruction: **"run checkpoint"** or **"save session state"**. The Maestro executes the full Checkpoint Procedure immediately.

## Guardrails

- Never skip the WIP commit step if there are uncommitted changes — a checkpoint without a recoverable git state is incomplete.
- The Resume Prompt must be fully self-contained. Assume zero shared context with the next session.
- Do not checkpoint mid-dispatch — wait for the current sub-agent to complete and deliver its handoff before triggering.
- Reset `DISPATCH_COUNT` to 0 after each checkpoint so the counter does not immediately re-trigger in the resumed session.
