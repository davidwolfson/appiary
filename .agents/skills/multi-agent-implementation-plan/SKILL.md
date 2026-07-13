---
name: multi-agent-implementation-plan
description: Create an Appiary implementation plan from given acceptance criteria using three independent planning sub-agents, claim verification, and synthesized output. Use when the user invokes /multi-agent-implementation-plan, $multi-agent-implementation-plan, asks for a multi-agent implementation plan, or asks to turn acceptance criteria, requirements, tickets, issues, or feature specs into a verified implementation plan.
---

# Multi-Agent Implementation Plan

Use this skill to turn acceptance criteria into a practical Appiary implementation plan with three independent planning passes, verification against the repository, and a synthesized final plan saved at the repository root.

## Inputs

Accept any of these inputs:

- Acceptance criteria supplied directly in the prompt.
- A ticket, issue, PRD, spec, design note, or user story supplied by path, URL, pasted text, or reference.
- A branch, changed file list, or existing partial implementation that the plan must account for.

Before spawning agents, identify:

- `planning_scope`: the exact acceptance criteria, ticket, spec, branch, file list, or working tree context being planned from.
- `implementation_context`: relevant existing modules, packages, conventions, or prior work discovered locally.
- `output_label`: a filesystem-safe ticket, feature, branch, or short requirement name. Use the current branch name when no better label is available.

If acceptance criteria are missing or too vague to plan responsibly, ask the user for the criteria before spawning agents. If a referenced ticket or spec cannot be accessed, state that limitation and plan from the available prompt text.

## Required Context

Prefer local repository context over assumptions. Before spawning agents, inspect enough of the codebase to identify likely affected areas, such as:

- Workspace/package layout and scripts.
- Existing backend, frontend, shared type, and e2e patterns relevant to the criteria.
- Available convention files, especially `backendConvention.md`, `frontendConventions.md`, and `e2e-conventions.md` when present.
- Existing tests or fixtures that should be extended.

If convention files are missing, continue with the available context and state the gap in the final plan.

## Agent Workflow

Spawn three independent planning agents in parallel. Each agent must read the acceptance criteria and inspect relevant repository context independently. Encourage different solution paths; do not require the agents to agree.

Use these three prompts as the basis for the planning agents:

```text
You are implementation planning agent A for Appiary. Read the acceptance criteria and inspect the relevant codebase context for {planning_scope}. Produce a practical implementation plan optimized for the smallest coherent change that satisfies the criteria. Include affected files or modules, data/API contracts, UI behavior, tests, migration or compatibility concerns, risks, and open questions. Ground every concrete step in repository evidence where possible.
```

```text
You are implementation planning agent B for Appiary. Read the acceptance criteria and inspect the relevant codebase context for {planning_scope}. Produce an implementation plan optimized for correctness, maintainability, and convention alignment. Consider backend, frontend, shared types, e2e coverage, edge cases, failure modes, and rollout sequencing. Ground every concrete step in repository evidence where possible.
```

```text
You are implementation planning agent C for Appiary. Read the acceptance criteria and inspect the relevant codebase context for {planning_scope}. Produce an implementation plan optimized for user-visible behavior and testability. Identify likely UI flows, API interactions, state transitions, selectors/fixtures, unit and e2e tests, and validation checks. Ground every concrete step in repository evidence where possible.
```

After all three planning agents finish, spawn a verification agent. Provide the three raw plans and ask it to verify feasibility and coverage against the acceptance criteria and codebase.

Use this prompt as the basis for the verification agent:

```text
You are the verification agent for an Appiary multi-agent implementation plan. Read the three raw plans below and verify each proposed step against {planning_scope}, the acceptance criteria, and the repository. Keep only steps that are feasible, necessary, and grounded in code or clearly marked as assumptions. Merge duplicates, flag conflicts, identify missing acceptance-criteria coverage, and discard speculative or overbuilt work. For each kept step, include area, affected files or nearest modules, verification evidence, dependencies, and test implications. Also list discarded proposals with a short reason.
```

After the verification agent finishes, spawn a synthesizing agent. Provide the verified steps, conflicts, coverage gaps, and discarded proposals, then ask it to produce one composite implementation plan.

Use this prompt as the basis for the synthesis agent:

```text
You are the synthesis agent for an Appiary multi-agent implementation plan. Read the verified planning material below and synthesize one implementation plan. Lead with a concise objective and acceptance-criteria coverage map. Then provide ordered phases with concrete steps, affected files or modules, rationale, dependencies, and tests. Include sections for risks, open questions, discarded proposals, validation commands, and assumptions. Do not include raw agent transcripts.
```

## Output File

Save the synthesis as a top-level Markdown file:

```text
{output_label}ImplementationPlan.md
```

Normalize `output_label` for filenames:

- Preserve letters, digits, `.`, `_`, and `-`.
- Replace spaces and path separators with `-`.
- Remove other punctuation.
- If the label is empty, use `CurrentBranch`.

The saved document must include:

- Title: `# {output_label} Implementation Plan`
- Planning scope and acceptance criteria source.
- Acceptance-criteria coverage map.
- Ordered implementation phases.
- Affected files or modules.
- Test plan and validation commands.
- Risks, assumptions, open questions, and discarded proposals.

After saving, report the output file path and a brief summary of the planned phases and unresolved questions.

## Planning Standards

Prefer implementation plans that are concrete and executable:

- Tie work to acceptance criteria, existing code paths, and named files or modules.
- Keep phases ordered by dependency, not by agent area.
- Include backend, frontend, shared contract, and e2e work only when required by the criteria.
- Call out test data, fixtures, selectors, migrations, feature flags, permissions, and compatibility concerns when relevant.
- Avoid broad rewrites, speculative architecture, or optional polish unless clearly required.
- Surface ambiguity as open questions instead of burying assumptions in the plan.
