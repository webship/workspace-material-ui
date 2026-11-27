Feature: The starter alone
  Material UI's own Vite starter, as it ships: one page, with its heading, its tip and its link to the templates.

  # The minimal template: bash cmd-material-ui-project.sh muimin --template minimal --install

  Scenario: The starter's page is drawn
    Given I go to "/"
    Then I should see "Material UI Vite example in TypeScript"
    And I should see "Pro tip: See more templates in the Material UI documentation."
    And the link "templates" with the href "https://mui.com/material-ui/getting-started/templates/" should exist
    And no dialog should be shown
