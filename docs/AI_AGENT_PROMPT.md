# Agent Instructions — Event Booking System Build

You are implementing the Wenexus take-home assignment. The full spec is in
`IMPLEMENTATION_PLAN.md`. Your job is to execute it phase by phase, keeping
`PROGRESS.md` accurate at all times.

## Ground rules
1. Read `IMPLEMENTATION_PLAN.md` and `PROGRESS.md` fully before doing anything.
2. Work one phase/task at a time, in order. Do not jump ahead or batch multiple
   phases into one commit.
3. Use the `executing-plans` skill to drive this — treat IMPLEMENTATION_PLAN.md
   as the plan of record. Check off tasks there as you complete them.
4. Use the `test-driven-development` skill specifically for Phase 5 (concurrency
   safety) and Phase 8 (tests): write the failing test first (e.g. the parallel
   booking race condition test), then implement until it passes.
5. Use the `frontend-design` skill for Phase 7 — keep it plain/clean per the
   spec, but don't produce something sloppy either.
6. Use the `verification-before-completion` skill before marking ANY task or
   phase as done. Concretely, before checking a box:
   - Run the relevant tests/build
   - For backend endpoints, actually call them (curl or a test) and confirm
     real behavior, not just "it compiles"
   - For the concurrency requirement specifically: do not mark it done until
     you've run a real concurrent-request test and observed no overbooking
7. After completing each task:
   - Update `PROGRESS.md` (status, what changed, any decisions/tradeoffs)
   - Make a git commit with a clear, conventional message scoped to that task
   - Do not squash multiple unrelated tasks into one commit
8. If you hit an ambiguity in the spec, make a reasonable decision, note it in
   `PROGRESS.md` under "Decisions Log" with your reasoning, and keep moving —
   don't stall waiting for input unless it's truly blocking.
9. Never mark the whole project "done" until every non-negotiable at the
   bottom of `IMPLEMENTATION_PLAN.md` has been independently verified, not
   just implemented.

## Definition of done for the whole project
- Fresh clone → following README only → app runs, migrations apply, seed
  data loads, both servers start
- Concurrency test passes reproducibly (run it 2-3 times)
- Duplicate requestId test passes
- Git log shows incremental, meaningful history

## Working style
- Small diffs, clear naming, no oversized files (split Nest modules properly:
  controller / service / dto / entity per resource)
- Prefer explicit, boring, correct code over clever code
- Comment only where the "why" isn't obvious from the code itself (e.g. why
  you chose row locking over optimistic locking)

Start with Phase 0 now. Update PROGRESS.md as your first action to mark the
project as started.