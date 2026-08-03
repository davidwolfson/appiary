# Auth UI / End-to-End Tests

## Login

### Login page renders for guests
Given I am not authenticated
When I navigate to `/login`
Then I should see the "Welcome back" heading
Then I should see an email field
Then I should see a password field
Then I should see a "Sign in" submit button
Then I should see a link to `/register`

### Authenticated users cannot access the login page
Given I am already authenticated
When I navigate to `/login`
Then I should be redirected to `/`
Then I should see the signed-in home screen

### Login requires both fields
Given I am on the login page
When I submit the form with the email and password fields empty
Then the login request should not be sent
Then the form should be marked as touched
Then I should remain on `/login`

### Login validates email format
Given I am on the login page
When I enter an invalid email address
And I enter any password
And I submit the form
Then the login request should not be sent
Then I should remain on `/login`

### Login succeeds with valid credentials
Given I am on the login page
When I enter a valid email address
And I enter a password
And I submit the form
Then a login request should be sent with the entered email and password
Then I should be redirected to `/`
Then I should see the home screen

### Login shows loading state while the request is in progress
Given I am on the login page
When I submit valid credentials and the login request is still pending
Then the submit button should be disabled
Then the button label should change to "Signing in..."

### Login shows an API error message on failure
Given I am on the login page
When I submit valid credentials
And the login request fails with an API error message
Then I should see a danger alert with that error message
Then I should remain on `/login`

### Login falls back to a generic error message when no API message is returned
Given I am on the login page
When I submit valid credentials
And the login request fails without an API error message
Then I should see a danger alert containing "Something went wrong"

### Login page can navigate to register
Given I am on the login page
When I click the "Register" link
Then I should navigate to `/register`
Then I should see the register form

## Register

### Register page renders for guests
Given I am not authenticated
When I navigate to `/register`
Then I should see the "Create your apiary" heading
Then I should see an account name field
Then I should see an email field
Then I should see a password field
Then I should see a confirm password field
Then I should see a "Create account" submit button
Then I should see a link to `/login`

### Authenticated users cannot access the register page
Given I am already authenticated
When I navigate to `/register`
Then I should be redirected to `/`
Then I should see the signed-in home screen

### Register requires all fields
Given I am on the register page
When I submit the form with all fields empty
Then the register request should not be sent
Then the form should be marked as touched
Then I should remain on `/register`

### Register validates email format
Given I am on the register page
When I enter an invalid email address
And I complete the other fields with otherwise valid values
And I submit the form
Then the register request should not be sent
Then I should remain on `/register`

### Register enforces the maximum account name length
Given I am on the register page
When I enter an account name longer than 255 characters
And I complete the other fields with valid values
And I submit the form
Then the register request should not be sent
Then I should remain on `/register`

### Register enforces minimum password length
Given I am on the register page
When I enter a password shorter than 8 characters
And I enter the same short value in confirm password
And I complete the other fields with valid values
And I submit the form
Then the register request should not be sent
Then I should remain on `/register`

### Register requires matching passwords
Given I am on the register page
When I enter different values in password and confirm password
And I submit the form
Then the register request should not be sent
Then I should see a warning alert containing "Passwords must match."
Then I should remain on `/register`

### Register succeeds with valid values
Given I am on the register page
When I enter a valid account name
And I enter a valid email address
And I enter a password with at least 8 characters
And I enter the same password in confirm password
And I submit the form
Then a register request should be sent with the entered account name, email, password, and confirm password
Then I should be redirected to `/`
Then I should see the home screen

### Register shows loading state while the request is in progress
Given I am on the register page
When I submit valid registration details and the register request is still pending
Then the submit button should be disabled
Then the button label should change to "Creating account..."

### Register shows an API error message on failure
Given I am on the register page
When I submit valid registration details
And the register request fails with an API error message
Then I should see a danger alert with that error message
Then I should remain on `/register`

### Register falls back to a generic error message when no API message is returned
Given I am on the register page
When I submit valid registration details
And the register request fails without an API error message
Then I should see a danger alert containing "Something went wrong"

### Register page can navigate to login
Given I am on the register page
When I click the "Sign in" link
Then I should navigate to `/login`
Then I should see the login form
# Session lifecycle

- Authentication exists only for the current page lifetime; refreshing a protected page redirects to `/login`.
- Five minutes without pointer, keyboard, touch, or scroll input clears the local session and redirects to `/login`.
- Qualifying user input resets the full five-minute inactivity deadline.
- Logout and API `401` responses use the same local invalidation behavior.
