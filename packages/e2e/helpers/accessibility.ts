import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

const wcagLevelATags = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
] as const;

export async function expectAccessiblePage(
  page: Page,
  testInfo: TestInfo,
  stateName: string,
): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags([...wcagLevelATags])
    .analyze();
  const diagnostics = {
    state: stateName,
    url: results.url,
    violations: results.violations,
    incomplete: results.incomplete,
  };

  await testInfo.attach(`axe-${stateName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`, {
    body: Buffer.from(JSON.stringify(diagnostics, null, 2)),
    contentType: "application/json",
  });

  const violationSummary = results.violations.flatMap((violation) =>
    violation.nodes.map((node) => [
      `${violation.id} (${violation.impact ?? "impact unknown"})`,
      violation.helpUrl,
      `target: ${node.target.join(" ")}`,
      `failure: ${node.failureSummary ?? "No failure summary provided."}`,
    ].join(" | ")),
  ).join("\n");

  expect(
    results.violations,
    `${stateName} has WCAG 2.2 A/AA Axe violations${violationSummary ? `:\n${violationSummary}` : "."}`,
  ).toEqual([]);
}
