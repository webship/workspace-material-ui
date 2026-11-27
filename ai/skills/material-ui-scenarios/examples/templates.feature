Feature: The demo's templates
  Material UI's free templates as MUI ships them: the sign-in form and its dialog, the checkout's steps, and the CRUD
  dashboard's table, its dialog and its notification.

  # The demo template: bash cmd-material-ui-project.sh muiapp --install

  Scenario: The sign-in form, sent empty, marks its fields
    Given I go to "/sign-in"
    When I press "Sign in"
    Then 2 fields should be shown as invalid
    And the "Email" field should show the message "Please enter a valid email address."

  Scenario: The sign-in template's dialog, opened by a button that looks like a link
    Given I go to "/sign-in"
    When I open the "Reset password" dialog with the "Forgot your password?" button
    Then the "Reset password" dialog should show "Enter your account's email address"
    When I press "Cancel" in the "Reset password" dialog
    Then the "Reset password" dialog should not be shown

  Scenario: The checkout's first step
    Given I go to "/checkout"
    Then the "Shipping address" step should be the current one
    And the "Shipping address" step should not be done

  # Below 900 px wide: at 900 px and wider the template hides its whole app from assistive technology (its phone's side
  # panel is open but not displayed). The template keeps its employees in the browser's local storage.
  Scenario: The CRUD dashboard asks before it deletes, then says it is done
    Given I go to "/"
    And local storage is cleared
    And I set the viewport width to 899
    When I go to "/crud-dashboard"
    And I press "Delete" in the row "Edward Perry" of the "Employees" table
    And I press "Delete" in the "Delete employee?" dialog
    Then I should see a success notification "Employee deleted successfully."
    And the "Employees" table should not have a row "Edward Perry"
