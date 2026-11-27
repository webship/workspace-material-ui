---
name: material-ui-scenarios
description: Write and fix webship-js scenarios for a Material UI app with the Material UI step pack (`@webship-js/material-ui-steps`) in the Webship Workspace — the pack's phrases for dialogs, side panels, drop-down menus, select lists and search lists, fields, panels, tabs, trees, steppers, notifications, alerts, progress, pagination and tables, how the steps name things (a dialog by its title, a field by its label, a row by a text it shows), the waits built into them, the traps found on Material UI's own templates and on a real app, and three example features that pass. Use when writing a feature for a Material UI app, choosing the phrase for a dialog, a list or a table, or reading why a Material UI scenario failed.
---

# material-ui-scenarios

Scenarios for Material UI apps in a Webship Workspace (`~/workspace`), a container-based workspace (DDEV by default),
with webship-js and [`@webship-js/material-ui-steps`](https://github.com/webship/material-ui-steps). An app of the
Material UI builder (`cmd-material-ui-project.sh`) gets the pack with `bash cmd-tools-testing.sh <app>`; the suite runs
in the app's container (`bash cmd-tools-testing.sh <app> --run`).

Material UI draws its dialogs, side panels, menus, the options of its lists, tooltips and notifications in portals at
the end of the page, with transitions of its own. The steps find each one by its name and wait for what the component
says: its role, its classes, the end of its transitions. They never wait a fixed time.

## The phrases

Check them against the installed pack before you use them
(`grep -hE "^(Given|When|Then)\(" node_modules/@webship-js/material-ui-steps/tests/step-definitions/*.steps.js`).

**Dialogs, side panels, drop-down menus, tooltips**

```gherkin
When I open the "Reset password" dialog with the "Forgot your password?" button
When I open the "Dashboard" drop-down menu
Then the "Reset password" dialog should show "Enter your account's email address"
When I press "Cancel" in the "Reset password" dialog
When I press Escape in the "Dashboard" drop-down menu
When I click outside the "Use Google's location service?" dialog
Then no dialog should be shown
When I choose "My account" from the "Dashboard" drop-down menu
When I hover over the "Delete" button
Then the "Delete" tooltip should be shown
When I wait for the transitions to finish
```

**Fields, select lists, search lists**: a field and a list by its label.

```gherkin
Then 2 fields should be shown as invalid
Then the "Email" field should show the message "Please enter a valid email address."
When I choose "Twenty" in the "Age" select list
Then the "Age" select list should show "Twenty"
Then the "Age" select list should not offer "Forty"
When I type "God" in the "Movie" search list and choose "The Godfather"
Then the "Movie" search list should show "The Godfather"
```

**Panels, tabs, trees, steppers**

```gherkin
When I expand the "Accordion 1" panel
Then the "Accordion 1" panel should be expanded
When I switch to the "Item Two" tab
Then the "Item Two" tab should be active
When I expand the "Blog" item of the tree
Then the tree should show "Announcements"
Then the "Shipping address" step should be the current one
```

**Notifications, alerts, progress, badges, pagination, breadcrumbs**

```gherkin
Then I should see a success notification "Employee deleted successfully."
Then the "Note archived" notification should hide by itself
Then I should see the warning alert "This Alert displays the default close icon."
When I dismiss the alert "Click the close icon to see the Collapse transition in action!"
Then I should see a loading spinner
Then the progress bar should reach 50%
Then the "show 4 unread messages" button should show the badge "4"
Then the current page of the pagination should be "2"
Then the breadcrumb should read "MUI > Core > Breadcrumbs"
```

**Tables and data grids**: a table by its name or the heading before it, a row by a text it shows.

```gherkin
Then the "Employees" table should show 3 rows
When I press "Delete" in the row "Edward Perry" of the "Employees" table
Then the "Employees" table should not have a row "Edward Perry"
When I sort the "Employees" table by "Age" descending
Then the "Employees" table should be sorted by "Age" descending
```

webship-js's own steps still go to an address (`Given I go to "/components"`), read the page (`Then I should see
"Material UI demo"`), fill in fields (`When I fill in "Email" with "…"`) and press buttons (`When I press "Sign in"`).

## The traps

- **The app's root is hidden while a modal is open.** An open dialog, side panel, menu or select list puts
  `aria-hidden="true"` on the rest of the page: what is behind it has no role for a screen reader or for a role query.
  The pack's steps look inside the open component; close it before a step of webship-js reads the page.
- **A select list is named by its label and its value.** Material UI points the combobox's `aria-labelledby` at both
  ("Age Twenty"): the pack finds it by its label alone, the asterisk of a required one aside. A webship-js step that
  matches the whole name does not.
- **A list's options fade out after a choice**, while the list already shows it. The pack waits for them to be gone;
  a click right after a step of webship-js can land on them.
- **An option with a second line** (a company and its kind) is chosen by its first line.
- **A Stepper has no ARIA** for its current step or the ones done: the pack reads `Mui-active` and `Mui-completed`.
- **A table that says nothing of its sorting** (no `aria-sort`) is read from its `TableSortLabel`: active, and its
  arrow pointing up or down.
- **Material UI's CRUD dashboard template hides its whole app at 900 px and wider**: its phone's side panel is open
  but not displayed, and as a modal it hides the app's root. Test it below 900 px (`And I set the viewport width to
  899`), and clear the browser's local storage first: the template keeps its employees there.
- **The marketing page's menu at a phone's width makes the app unmount** (Material UI 9 throws "MenuListContext is
  missing"): test that template at a desktop's width.
- **Some controls of the templates have no name** (the colour mode list and button, the sign-in template's buttons to
  sign in with Google and Facebook, the dashboard's date picker): a scenario cannot name them, and should say so rather
  than reach for a selector.
- **An app's demo data may change on every load** (react-admin's e-commerce demo makes its records at random): assert
  what every load has (a count of rows on a page, the columns, a notification), never a record's text.
- **No fixed waits.** The steps wait on the components' own signals; a Then step waits for what it expects.

## The examples

Three features that pass, each against the app it names:

- [`examples/components.feature`](examples/components.feature): the demo template
  (`bash cmd-material-ui-project.sh muiapp --install`), its page of Material UI's documentation demos: a dialog, a
  menu, a select list and a search list, a panel, tabs and a notification.
- [`examples/templates.feature`](examples/templates.feature): the demo's templates (the same app): the sign-in form and
  its dialog, the checkout's steps, the CRUD dashboard's table, dialog and notification.
- [`examples/starter.feature`](examples/starter.feature): Material UI's starter alone
  (`bash cmd-material-ui-project.sh muimin --template minimal --install`), its one page.

## The book

For any automated functional testing in this work (a Gherkin feature, a step definition, choosing a
step, a test run and its failures), read the book *Automated Functional Testing Recipes* first.

- **Where.** Use the first that exists: `.claude/automated-functional-testing-recipes/` in the project,
  `~/.claude/automated-functional-testing-recipes/` (installed by webship/webship-js-ai-agent,
  webship/webship-js-skills or webship/ai-agents), or
  https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes
- **How.** Its `README.md` first, then the chapter that matches the task (one file per chapter,
  named by its subject), not the single complete file.
- **Which wins.** The installed webship-js package and the step pack are the source of truth for
  step phrasing. When they differ from the book, follow them and say so.
- **For Material UI.** Start with `ch08-modal-dialog-testing.md` (dialogs and side panels, opened, answered and
  closed), `ch07-waiting-dynamic-content.md` (why a wait names its signal, never a time),
  `ch09-table-list-testing.md` (tables, rows and lists) and `ch15-accessibility-testing.md` (names a person reads).
