Feature: The demo's components
  Material UI's documentation demos on the demo's /components page: a dialog, a drop-down menu, a select list, a search
  list, panels, tabs and a notification, each named the way a person reads it.

  # The demo template: bash cmd-material-ui-project.sh muiapp --install

  Scenario: A dialog opened with its button, answered with one of its own
    Given I go to "/components"
    When I open the "Use Google's location service?" dialog with the "Open alert dialog" button
    Then the "Use Google's location service?" dialog should show "Let Google help apps determine location."
    When I press "Agree" in the "Use Google's location service?" dialog
    Then no dialog should be shown

  Scenario: A drop-down menu named by the button that opens it
    Given I go to "/components"
    When I open the "Dashboard" drop-down menu
    Then the "Dashboard" drop-down menu should show "My account"
    When I choose "My account" from the "Dashboard" drop-down menu
    Then no drop-down menu should be shown

  Scenario: A select list and a search list
    Given I go to "/components"
    When I choose "Twenty" in the "Age" select list
    Then the "Age" select list should show "Twenty"
    And the "Age" select list should not offer "Forty"
    When I type "God" in the "Movie" search list and choose "The Godfather"
    Then the "Movie" search list should show "The Godfather"

  Scenario: A panel, the tabs, and a notification that hides by itself
    Given I go to "/components"
    When I expand the "Accordion 1" panel
    Then the "Accordion 1" panel should be expanded
    When I switch to the "Item Two" tab
    Then the "Item Two" tab should be active
    When I press "Open Snackbar"
    Then I should see a notification "Note archived"
    And the "Note archived" notification should hide by itself
