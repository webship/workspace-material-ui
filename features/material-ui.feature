Feature: The Material UI plugin on the dashboard
  Once the plugin is activated and installed, the sites folders offer the Material UI builder, each AI folder
  lists the items of its kind the plugin ships, and the Plugins page lists the plugin with what it ships.

  # Settings lists every plugin that was added; the package and what the plugin ships are on its own page.
  Scenario: Settings lists the plugin, and its own page names its package and what it ships
    Given I am on "/settings"
     Then I should see "Material UI"
     When I go to "/settings/plugin/material-ui"
     Then I should see "@webship.co/workspace-material-ui"
      And I should see "cmd-material-ui-project.sh"
      And I should see "material-ui-app-builder"

  Scenario: A sites folder offers the Material UI builder
    Given I am on "/dev"
     Then "option[value='cmd-material-ui-project.sh']" should be attached

  # The AI folders are searched by name: with every plugin on, a folder lists more than one page of items.
  Scenario: The AI Agents folder lists the agents the plugin ships
    Given I am on "/ai-agents?q=material-ui-"
     Then I should see "material-ui-app-builder"
      And I should see "material-ui-tester"

  Scenario: The AI Skills folder lists the skill the plugin ships
    Given I am on "/ai-skills?q=material-ui-scenarios"
     Then I should see "material-ui-scenarios"

  Scenario: The AI Commands folder lists the command the plugin ships
    Given I am on "/ai-commands?q=material-ui-test"
     Then I should see "material-ui-test"

  Scenario: The AI Prompts folder lists the prompts the plugin ships
    Given I am on "/ai-prompts?q=material-ui-"
     Then I should see "material-ui-build-and-test"
      And I should see "material-ui-scenarios-for-an-app"
