# FMRL Dispatch Strategy — GitHub Issues + Parallel Agents

> How phase documents become micro-tasks, GitHub issues, and parallel agent work.

## The Two-Layer Model

```
Layer 1: Phase Documents (immutable contracts)
    .plan/phases/PHASE-N-*.md
    Created once, reviewed, approved.
    Agents READ these — they never modify them.

Layer 2: Micro-Tasks (execution tracking)
    GitHub Issues on Sheshiyer/fmrl
    Created when "execute phase N" is triggered.
    Agents CLOSE these with evidence.
```

## Dispatch Flow

### Step 1: Phase Activation
User says: "Execute Phase N"

### Step 2: Issue Creation
For each task in the phase's wave/swarm structure:
```
gh issue create \
  --repo Sheshiyer/fmrl \
  --title "[P{N}-W{W}-S{S}] {task title}" \
  --body "$(cat <<EOF
## Phase: {N} — {phase name}
## Wave: {W} | Swarm: {S}

### Task
{task description}

### Deliverable
{one sentence deliverable}

### Acceptance Criteria
{testable acceptance from phase doc}

### Validation
{how completion is proven}

### Dependencies
{list of issue numbers this depends on}

### Phase Doc Reference
.plan/phases/PHASE-{N}-{slug}.md — Section: {wave/swarm}
EOF
)"  \
  --label "phase-{N},wave-{W},swarm-{S},{area}" \
  --assignee ""
```

### Step 3: Agent Dispatch
For each independent swarm, spawn an agent:
```
Agent receives:
  1. The phase document (full text — this IS the context)
  2. The GitHub issue numbers for their swarm
  3. Instruction: "Complete these issues. Close each with evidence."
```

### Step 4: Progress Tracking
Monitor via:
```bash
# See all open issues for a phase
gh issue list --repo Sheshiyer/fmrl --label "phase-N" --state open

# See what's done
gh issue list --repo Sheshiyer/fmrl --label "phase-N" --state closed
```

### Step 5: Wave Gating
Agents for Wave 2 are NOT dispatched until all Wave 1 issues are closed.
This prevents dependency violations.

## Label Taxonomy

| Label | Format | Purpose |
|-------|--------|---------|
| Phase | `phase-0` through `phase-6` | Phase grouping |
| Wave | `wave-1` through `wave-4` | Execution order |
| Swarm | `swarm-a` through `swarm-j` | Parallel work cluster |
| Area | `frontend`, `backend`, `infra`, `docs`, `qa` | Work domain |
| Status | `blocked`, `in-progress`, `needs-review` | Execution state |

## Agent Instructions Template

When dispatching an agent for a swarm:

```
You are executing Swarm {S} of Wave {W} in Phase {N} of the FMRL plan.

CONTEXT: Read .plan/phases/PHASE-{N}-{slug}.md for full architecture context.

YOUR ISSUES: #{issue1}, #{issue2}, #{issue3}

FOR EACH ISSUE:
1. Read the issue description
2. Implement the change
3. Run the validation described in the issue
4. Comment on the issue with evidence (test output, screenshot, diff)
5. Close the issue

CONSTRAINTS:
- Do NOT modify files outside the scope described in the phase doc
- Do NOT create new issues — only close your assigned ones
- If blocked, comment on the issue explaining why and move to next

WHEN DONE: All your issues should be closed with evidence comments.
```

## Drift Prevention Mechanisms

1. **Phase docs are immutable** — agents read them but never edit
2. **Issues reference phase doc sections** — traceable back to the plan
3. **Wave gating** — sequential waves prevent dependency violations
4. **Scope constraints** — agents told explicitly what files they can touch
5. **Evidence-based closure** — issues can't close without proof
6. **Cross-agent isolation** — swarms work on different files/components

## Phase Dependency Graph

```
Phase 0 (Foundation)
    │
    ▼
Phase 1 (Multi-Engine Architecture)
    │
    ├────────────┐
    ▼            ▼
Phase 2       Phase 3
(Timing)     (Profile)
    │            │
    ├────────────┤
    ▼            │
Phase 5          │
(Platforms)      │
    │            │
    │     ┌──────┘
    │     ▼
    │  Phase 4
    │  (Workflows)
    │     │
    └─────┤
          ▼
       Phase 6
       (Production)
```

Note: Phase 2 and Phase 3 can execute IN PARALLEL after Phase 1.
Phase 5 can start after Phase 2 (doesn't need Phase 3 or 4).
