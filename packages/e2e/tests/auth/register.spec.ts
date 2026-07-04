import { expect, test } from "@playwright/test";

import type { RegisterRequest } from "@appiary/types";

import { createAuthResponse, createAuthenticatedUser, mockRegisterRequest, visitAsAuthenticatedUser } from "../../helpers/auth";
import { mockListHivesRequest } from "../../helpers/hives";
import { routes } from "../../helpers/routes";
import { createRegistrationInput } from "../../helpers/test-data";
import { createHomePage } from "../../pages/home-page";
import { createRegisterPage } from "../../pages/register-page";

test.describe("register", () => {
  test("renders the register form for guests", async ({ page }) => {
    const registerPage = createRegisterPage(page);

    // given I am not authenticated
    await registerPage.goto();

    // when I navigate to /register

    // then I should see the guest register screen
    await registerPage.expectVisible();
  });

  test("redirects authenticated users away from the register page", async ({ page }) => {
    const user = createAuthenticatedUser();
    const homePage = createHomePage(page);
    const registerPage = createRegisterPage(page);

    // given I am already authenticated
    await visitAsAuthenticatedUser(page, user);

    // when I navigate to /register
    await registerPage.goto();

    // then I should be redirected to / and see the signed-in home screen
    await expect(page).toHaveURL(/\/$/);
    await homePage.expectSignedIn(user);
  });

  test("does not submit an empty register form", async ({ page }) => {
    const registerPage = createRegisterPage(page);
    const { requests } = await mockRegisterRequest(page, async (route) => {
      await route.abort();
    });

    // given I am on the register page
    await registerPage.goto();

    // when I submit the form with all fields empty
    await registerPage.submit();

    // then the register request should not be sent and the form should be touched
    expect(requests).toHaveLength(0);
    await expect(registerPage.accountNameInput).toHaveClass(/ng-touched/);
    await expect(registerPage.emailInput).toHaveClass(/ng-touched/);
    await expect(registerPage.passwordInput).toHaveClass(/ng-touched/);
    await expect(registerPage.confirmPasswordInput).toHaveClass(/ng-touched/);
    await expect(page).toHaveURL(new RegExp(`${routes.register}$`));
  });

  test("does not submit when the email is invalid", async ({ page }) => {
    const registerPage = createRegisterPage(page);
    const registration: RegisterRequest = {
      ...createRegistrationInput(),
      email: "not-an-email",
      confirmPassword: "secret123",
    };
    const { requests } = await mockRegisterRequest(page, async (route) => {
      await route.abort();
    });

    // given I am on the register page
    await registerPage.goto();

    // when I enter an invalid email and otherwise valid values
    await registerPage.fillForm(registration);
    await registerPage.submit();

    // then the register request should not be sent and I should remain on /register
    expect(requests).toHaveLength(0);
    await expect(page).toHaveURL(new RegExp(`${routes.register}$`));
  });

  test("does not submit when the account name exceeds the maximum length", async ({ page }) => {
    const registerPage = createRegisterPage(page);
    const registration: RegisterRequest = {
      accountName: "A".repeat(256),
      email: "beekeeper@example.com",
      password: "secret123",
      confirmPassword: "secret123",
    };
    const { requests } = await mockRegisterRequest(page, async (route) => {
      await route.abort();
    });

    // given I am on the register page
    await registerPage.goto();

    // when I enter an account name longer than 255 characters and submit
    await registerPage.fillForm(registration);
    await registerPage.submit();

    // then the register request should not be sent and I should remain on /register
    expect(requests).toHaveLength(0);
    await expect(page).toHaveURL(new RegExp(`${routes.register}$`));
  });

  test("does not submit when the password is shorter than 8 characters", async ({ page }) => {
    const registerPage = createRegisterPage(page);
    const registration: RegisterRequest = {
      accountName: "Apiary",
      email: "beekeeper@example.com",
      password: "short",
      confirmPassword: "short",
    };
    const { requests } = await mockRegisterRequest(page, async (route) => {
      await route.abort();
    });

    // given I am on the register page
    await registerPage.goto();

    // when I enter a short password and submit
    await registerPage.fillForm(registration);
    await registerPage.submit();

    // then the register request should not be sent and I should remain on /register
    expect(requests).toHaveLength(0);
    await expect(page).toHaveURL(new RegExp(`${routes.register}$`));
  });

  test("shows a warning when passwords do not match", async ({ page }) => {
    const registerPage = createRegisterPage(page);
    const { requests } = await mockRegisterRequest(page, async (route) => {
      await route.abort();
    });

    // given I am on the register page
    await registerPage.goto();

    // when I enter different values in password and confirm password
    await registerPage.accountNameInput.fill("Apiary");
    await registerPage.emailInput.fill("beekeeper@example.com");
    await registerPage.passwordInput.fill("secret123");
    await registerPage.confirmPasswordInput.fill("secret456");
    await registerPage.submit();

    // then the register request should not be sent, a warning should be shown, and I should remain on /register
    expect(requests).toHaveLength(0);
    await expect(registerPage.passwordMismatchMessage).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${routes.register}$`));
  });

  test("submits valid registration details and redirects home", async ({ page }) => {
    const registration: RegisterRequest = {
      ...createRegistrationInput(),
      confirmPassword: "secret123",
    };
    const user = createAuthenticatedUser({
      email: registration.email,
      accountName: registration.accountName,
    });
    const homePage = createHomePage(page);
    const registerPage = createRegisterPage(page);
    await mockListHivesRequest(page);
    const { requests } = await mockRegisterRequest(page, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(createAuthResponse(user)),
      });
    });

    // given I am on the register page
    await registerPage.goto();

    // when I enter valid registration details and submit the form
    await registerPage.fillForm(registration);
    await registerPage.submit();

    // then a register request should be sent with the entered values
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual(registration);

    // then I should be redirected to / and see the home screen
    await expect(page).toHaveURL(/\/$/);
    await homePage.expectSignedIn(user);
  });

  test("shows a loading state while the register request is pending", async ({ page }) => {
    const registration: RegisterRequest = {
      ...createRegistrationInput(),
      confirmPassword: "secret123",
    };
    const user = createAuthenticatedUser({
      email: registration.email,
      accountName: registration.accountName,
    });
    const registerPage = createRegisterPage(page);
    await mockListHivesRequest(page);
    let resolveRequest!: () => void;
    const requestReleased = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    await mockRegisterRequest(page, async (route) => {
      await requestReleased;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(createAuthResponse(user)),
      });
    });

    // given I am on the register page
    await registerPage.goto();

    // when I submit valid registration details and the request is still pending
    await registerPage.fillForm(registration);
    await registerPage.submit();

    // then the submit button should be disabled and show the loading label
    await expect(registerPage.loadingButton).toBeDisabled();

    resolveRequest();

    await expect(page).toHaveURL(/\/$/);
  });

  test("shows an API error message when register fails with an API message", async ({ page }) => {
    const registration: RegisterRequest = {
      ...createRegistrationInput(),
      confirmPassword: "secret123",
    };
    const registerPage = createRegisterPage(page);

    await mockRegisterRequest(page, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "An account with this email already exists." }),
      });
    });

    // given I am on the register page
    await registerPage.goto();

    // when I submit valid registration details and the request fails with an API error message
    await registerPage.fillForm(registration);
    await registerPage.submit();

    // then I should see a danger alert with that message and remain on /register
    await expect(registerPage.alert).toHaveText("An account with this email already exists.");
    await expect(page).toHaveURL(new RegExp(`${routes.register}$`));
  });

  test("falls back to a generic error message when register fails without an API message", async ({ page }) => {
    const registration: RegisterRequest = {
      ...createRegistrationInput(),
      confirmPassword: "secret123",
    };
    const registerPage = createRegisterPage(page);

    await mockRegisterRequest(page, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    // given I am on the register page
    await registerPage.goto();

    // when I submit valid registration details and the request fails without an API message
    await registerPage.fillForm(registration);
    await registerPage.submit();

    // then I should see the generic danger alert
    await expect(registerPage.alert).toContainText("Something went wrong");
    await expect(page).toHaveURL(new RegExp(`${routes.register}$`));
  });

  test("can navigate back to the login page", async ({ page }) => {
    const registerPage = createRegisterPage(page);

    // given I am on the register page
    await registerPage.goto();

    // when I click the Sign in link
    await registerPage.goToLogin();

    // then I should navigate to /login and see the login form
    await expect(page).toHaveURL(new RegExp(`${routes.login}$`));
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});
