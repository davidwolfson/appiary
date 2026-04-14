import { expect, type Page } from "@playwright/test";

import type { AuthenticatedUser } from "@appiary/types";

export function createHomePage(page: Page) {
  return {
    async expectSignedIn(user: AuthenticatedUser): Promise<void> {
      await expect(page.getByRole("heading", { name: `Welcome, ${user.accountName}` })).toBeVisible();
      await expect(page.getByText(`You are signed in as ${user.email}.`)).toBeVisible();
    },
  };
}
