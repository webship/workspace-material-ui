Feature: The demo's components answer
  As the owner of the app
  I want its dialogs, lists, panels and messages to open, answer and close
  So that a build that came out broken is caught before anything else is tested

  # Placed by the workspace's testing setup for the demo template, as a starting point: it is yours to change. The
  # steps find each component the way a person reads it, and wait for its own state and the end of its transitions.

  @critical
  Scenario: A dialog opened with its button, answered with one of its own
    Given I go to "/components"
    When I open the "Use Google's location service?" dialog with the "Open alert dialog" button
    Then the "Use Google's location service?" dialog should show "Let Google help apps determine location."
    When I press "Agree" in the "Use Google's location service?" dialog
    Then no dialog should be shown

  @critical
  Scenario: A select list: an option chosen, then the next one at once
    Given I go to "/components"
    When I choose "Twenty" in the "Age" select list
    Then the "Age" select list should show "Twenty"
    When I choose "Thirty" in the "Age" select list
    Then the "Age" select list should show "Thirty"

  Scenario: A panel expanded, then a notification that hides by itself
    Given I go to "/components"
    When I expand the "Accordion 1" panel
    Then the "Accordion 1" panel should show "Lorem ipsum dolor sit amet"
    When I press "Open Snackbar"
    Then I should see a notification "Note archived"
    And the "Note archived" notification should hide by itself

  Scenario: The sign-in template's fields, sent empty
    Given I go to "/sign-in"
    When I press "Sign in"
    Then the "Email" field should show the message "Please enter a valid email address."
    And the "Password" field should be shown as invalid
