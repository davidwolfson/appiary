---
name: multi-agent-review
description: Run an Appiary project review using multiple sub-agents. Use when the user invokes /multi-agent-review, $multi-agent-review, asks for a multi-agent review, or asks to review a branch, diff, designated changes, or PR against Appiary backendConvention.md, e2e-conventions.md, and frontendConventions.md with verified synthesis saved as a top-level CompositeReview document.
---

# Multi-Agent Review

Use this skill to review Appiary changes or a PR with independent convention-specific sub-agents, claim verification, and a synthesized final review saved at the repository root.

## Inputs

Accept any of these scopes:

- Current working tree or current branch if the user gives no explicit scope.
- A branch name, PR name, PR number, commit range, or changed file list supplied by the user.
- A designated subset of changes supplied in the prompt.

Before spawning agents, identify:

- `review_scope`: the exact branch, PR, diff, file list, or working tree being reviewed.
- `base_ref`: the comparison base if discoverable. Prefer the PR base, then upstream main/master, then local main/master. State the assumption if the base is inferred.
- `output_label`: a filesystem-safe branch or PR name. Use the current branch name when no PR name is available.

## Required Context

Confirm these files exist at the repository root before starting:

- `backendConvention.md`
- `e2e-conventions.md`
- `frontendConventions.md`

If one is missing, continue with the available convention files and state the missing file in the final review.

## Agent Workflow

Spawn three independent review agents in parallel. Each agent must read its assigned convention file and inspect only the relevant parts of the target changes, while still noting cross-layer risks when discovered.

Use these three prompts as the basis for the review agents:

```text
You are the backend review agent for Appiary. Read backendConvention.md completely. Review {review_scope} against backend conventions, code quality, simplicity, correctness, regressions, and missing tests. Focus on API, services, repositories, schemas, middleware, shared types used by backend, and backend tests. Return findings only when they are grounded in the diff or source, with severity, file path, line or nearest symbol, evidence, and suggested fix. If no issues are found, say so and list residual risks.
```

```text
You are the e2e review agent for Appiary. Read e2e-conventions.md completely. Review {review_scope} against e2e conventions, test reliability, selectors, page objects, fixtures, setup/teardown, coverage gaps, and likely flaky behavior. Return findings only when they are grounded in the diff or source, with severity, file path, line or nearest symbol, evidence, and suggested fix. If no issues are found, say so and list residual risks.
```

```text
You are the frontend review agent for Appiary. Read frontendConventions.md completely. Review {review_scope} against frontend conventions, Angular patterns, component simplicity, state/data flow, accessibility, user-facing regressions, and frontend tests. Return findings only when they are grounded in the diff or source, with severity, file path, line or nearest symbol, evidence, and suggested fix. If no issues are found, say so and list residual risks.
```

After all three review agents finish, spawn a confirmation agent. Provide the three raw reviews and ask it to verify every claim against the code and diff.

Use this prompt as the basis for the confirmation agent:

```text
You are the confirmation agent for an Appiary multi-agent review. Read the three raw reviews below and verify each claimed issue against {review_scope}. Keep only findings that are demonstrably true or high-confidence risks grounded in code. Drop duplicates, stale claims, style-only nits without convention support, and claims that cannot be verified. For each kept finding, include severity, source review area, file path, line or nearest symbol, verification evidence, and suggested fix. Also list discarded claims with a short reason.
```

After the confirmation agent finishes, spawn a synthesizing agent. Provide the verified findings and ask it to produce a single composite review.

Use this prompt as the basis for the synthesis agent:

```text
You are the synthesis agent for an Appiary multi-agent review. Read the verified findings below and synthesize one composite code review. Lead with findings ordered by severity. For each finding include severity, area, file path, line or nearest symbol, issue, evidence, impact, and suggested fix. Include a short "No Verified Issues" statement if nothing remains. Then include concise sections for discarded/unverified claims, test gaps or commands not run, and review scope assumptions. Do not include raw agent transcripts.
```

## Output File

Save the synthesis as a top-level Markdown file:

```text
{output_label}CompositeReview.md
```

Normalize `output_label` for filenames:

- Preserve letters, digits, `.`, `_`, and `-`.
- Replace spaces and path separators with `-`.
- Remove other punctuation.
- If the label is empty, use `CurrentBranch`.

The saved document must include:

- Title: `# {output_label} Composite Review`
- Review scope and base ref.
- Verified findings first, ordered by severity.
- Discarded or unverified claims.
- Test gaps or commands not run.
- Review assumptions.

After saving, report the output file path and a brief count of verified findings.

## Review Standards

Prefer high-signal findings:

- Bugs, behavioral regressions, data integrity problems, security/auth issues, broken tests, flaky tests, convention violations that affect maintainability, and missing coverage for changed behavior.
- Avoid speculative issues without code evidence.
- Avoid repeating the same root cause across agents; synthesize duplicate claims into one finding.
- Keep summaries brief and let findings carry the review.
