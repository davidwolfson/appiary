import { expect, test } from "@playwright/test";

import type { LoginRequest } from "@appiary/types";

import { createAuthResponse, createAuthenticatedUser, mockLoginRequest, visitAsAuthenticatedUser } from "../../helpers/auth";
import { mockListHivesRequest } from "../../helpers/hives";
import { routes } from "../../helpers/routes";
import { createHomePage } from "../../pages/home-page";
import { createLoginPage } from "../../pages/login-page";

test.describe("login", () => {
  test("renders the login form for guests", async ({ page }) => {
    const loginPage = createLoginPage(page);

    // given I am not authenticated
    await loginPage.goto();

    // when I navigate to /login

    // then I should see the guest login screen
    await loginPage.expectVisible();
  });

  test("redirects authenticated users away from the login page", async ({ page }) => {
    const user = createAuthenticatedUser();
    const homePage = createHomePage(page);
    const loginPage = createLoginPage(page);

    // given I am already authenticated
    await visitAsAuthenticatedUser(page, user);

    // when I navigate to /login
    await loginPage.goto();

    // then I should be redirected to / and see the signed-in home screen
    await expect(page).toHaveURL(/\/$/);
    await homePage.expectSignedIn(user);
  });

  test("does not submit an empty form", async ({ page }) => {
    const loginPage = createLoginPage(page);
    const { requests } = await mockLoginRequest(page, async (route) => {
      await route.abort();
    });

    // given I am on the login page
    await loginPage.goto();

    // when I submit the form with the email and password fields empty
    await loginPage.submit();

    // then the login request should not be sent and the form should be touched
    expect(requests).toHaveLength(0);
    await expect(loginPage.emailInput).toHaveClass(/ng-touched/);
    await expect(loginPage.passwordInput).toHaveClass(/ng-touched/);
    await expect(page).toHaveURL(new RegExp(`${routes.login}$`));
  });

  test("does not submit when the email is invalid", async ({ page }) => {
    const loginPage = createLoginPage(page);
    const invalidLogin: LoginRequest = {
      email: "not-an-email",
      password: "secret123",
    };
    const { requests } = await mockLoginRequest(page, async (route) => {
      await route.abort();
    });

    // given I am on the login page
    await loginPage.goto();

    // when I enter an invalid email address and submit the form
    await loginPage.fillForm(invalidLogin);
    await loginPage.submit();

    // then the login request should not be sent and I should remain on /login
    expect(requests).toHaveLength(0);
    await expect(page).toHaveURL(new RegExp(`${routes.login}$`));
  });

  test("submits valid credentials and redirects home", async ({ page }) => {
    const loginInput: LoginRequest = {
      email: "beekeeper@example.com",
      password: "secret123",
    };
    const user = createAuthenticatedUser({ email: loginInput.email });
    const homePage = createHomePage(page);
    const loginPage = createLoginPage(page);
    await mockListHivesRequest(page);
    const { requests } = await mockLoginRequest(page, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(createAuthResponse(user)),
      });
    });

    // given I am on the login page
    await loginPage.goto();

    // when I enter valid credentials and submit the form
    await loginPage.fillForm(loginInput);
    await loginPage.submit();

    // then a login request should be sent with the entered email and password
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual(loginInput);

    // then I should be redirected to / and see the home screen
    await expect(page).toHaveURL(/\/$/);
    await homePage.expectSignedIn(user);
  });

  test("shows a loading state while the login request is pending", async ({ page }) => {
    const loginInput: LoginRequest = {
      email: "beekeeper@example.com",
      password: "secret123",
    };
    const user = createAuthenticatedUser({ email: loginInput.email });
    const loginPage = createLoginPage(page);
    await mockListHivesRequest(page);
    let resolveRequest!: () => void;
    const requestReleased = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    await mockLoginRequest(page, async (route) => {
      await requestReleased;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(createAuthResponse(user)),
      });
    });

    // given I am on the login page
    await loginPage.goto();

    // when I submit valid credentials and the request is still pending
    await loginPage.fillForm(loginInput);
    await loginPage.submit();

    // then the submit button should be disabled and show the loading label
    await expect(loginPage.loadingButton).toBeDisabled();

    resolveRequest();

    await expect(page).toHaveURL(/\/$/);
  });

  test("shows an API error message when login fails with an API message", async ({ page }) => {
    const loginInput: LoginRequest = {
      email: "beekeeper@example.com",
      password: "secret123",
    };
    const loginPage = createLoginPage(page);

    await mockLoginRequest(page, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid credentials." }),
      });
    });

    // given I am on the login page
    await loginPage.goto();

    // when I submit valid credentials and the request fails with an API error message
    await loginPage.fillForm(loginInput);
    await loginPage.submit();

    // then I should see a danger alert with that message and remain on /login
    await expect(loginPage.alert).toHaveText("Invalid credentials.");
    await expect(page).toHaveURL(new RegExp(`${routes.login}$`));
  });

  test("falls back to a generic error message when the API response has no message", async ({ page }) => {
    const loginInput: LoginRequest = {
      email: "beekeeper@example.com",
      password: "secret123",
    };
    const loginPage = createLoginPage(page);

    await mockLoginRequest(page, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    // given I am on the login page
    await loginPage.goto();

    // when I submit valid credentials and the request fails without an API error message
    await loginPage.fillForm(loginInput);
    await loginPage.submit();

    // then I should see the generic danger alert
    await expect(loginPage.alert).toContainText("Something went wrong");
    await expect(page).toHaveURL(new RegExp(`${routes.login}$`));
  });

  test("can navigate to the register page", async ({ page }) => {
    const loginPage = createLoginPage(page);

    // given I am on the login page
    await loginPage.goto();

    // when I click the Register link
    await loginPage.goToRegister();

    // then I should navigate to /register and see the register form
    await expect(page).toHaveURL(new RegExp(`${routes.register}$`));
    await expect(page.getByRole("heading", { name: "Create your apiary" })).toBeVisible();
  });
});
