<p align="center"><img src="https://raw.githubusercontent.com/webship/workspace-material-ui/1.0.x/assets/logo.svg" alt="Material UI logo" width="96"></p>

# @webship.co/workspace-material-ui

Material UI for the [Webship Workspace](https://github.com/webship/workspace) dashboard: a builder that makes an app
with Material UI's own Vite starter (or takes one from its repository), builds it and serves its production build from a
container of its own, the [Material UI step pack](https://github.com/webship/material-ui-steps) wired into the testing
setup of that app, and its AI items — two agents, a skill, a command and two prompts for building and testing Material
UI apps — each listed in the workspace folder of its kind.

Material UI is MUI's library of React components; an app is a React app built with Vite. The app brings its own
language in its own container. Node.js runs in the app's container, at the version of the workspace rule (24); the app
is made there from Material UI's own Vite starter (`examples/material-ui-vite-ts` of Material UI 9.6.0), built there,
and its production build (`dist/`) is served by Vite's own preview server. Nothing of
Node.js, npm or Vite runs on the machine. The app is the starter with the demo of the Material UI step pack (Material
UI's free templates and its documentation's demos), the starter alone, or a Vite app of your own from its repository.

The workspace is container-based (DDEV by default): an app is a row like any other, so the row menus the core draws
(start, stop, launch, backup, clone, remove, tests) work on it; what does not apply to an app without a database is
listed under [What is different from a platform](#what-is-different-from-a-platform). The builder builds on DDEV by
default, and with `--runtime` on Docker Compose, Podman or a Kubernetes cluster: see [Runtimes](#runtimes).

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require material-ui --with-needs     # npm install into the dashboard
bash core/scripts/plugins.sh --activate material-ui --with-needs    # plugins.material-ui in settings.yml
bash core/scripts/plugins.sh --install material-ui                  # the builder, functions, args, AI items
bash core/scripts/plugins.sh --configure material-ui                # nothing to configure: it has no settings file
```

The same four steps are buttons on the dashboard's **Settings → Plugins** page. `--install` is idempotent.
`--uninstall` removes what it placed; an AI item you edited stays.

Everything the plugin carries lands in the folder it belongs to, when that folder is an active workspace folder:

| What | Lands in |
| --- | --- |
| `cmd-material-ui-project.sh` | every active sites folder: `dev/`, `test/`, `sandboxes/`, `demos/` |
| The agents `material-ui-app-builder`, `material-ui-tester` | `ai-agents/` |
| The skill `material-ui-scenarios` | `ai-skills/` |
| The command `/material-ui-test` | `ai-commands/` |
| The prompts `material-ui-build-and-test`, `material-ui-scenarios-for-an-app` | `ai-prompts/` |

There they are listed like any other item of the folder, and installed into Claude Code from there.

## What it needs

A workspace starts empty, so the manifest says what else this plugin needs (`needs`):

- one sites folder, for the builder: `dev`, `test`, `sandboxes`, `demos` (`dev` is the one added when none is there). The folder also carries `cmd-tools-testing.sh` and the Users tools this plugin's hooks answer to.
- `ai-agents`, `ai-skills`, `ai-commands` and `ai-prompts`: the AI folders its agents, its skill, its command and its prompts are placed in.

`--require` says so, `--activate` and `--install` stop until the workspace has them, and `--with-needs` adds what is
missing first:

```bash
bash core/scripts/plugins.sh --activate material-ui --with-needs   # dev and the four AI folders are required, activated and installed first
bash core/scripts/plugins.sh --install material-ui
```

Everything the builder runs for an app runs in the app's own container, through the container tool the workspace
already needs; the plugin asks for no command of its own on the machine. Making an app downloads the step pack and the
app's packages from the npm registry and Material UI's starter, templates and documentation demos from its repository
on GitHub, in the container.

## What the package holds

| Path | What it is |
| --- | --- |
| `commands/cmd-material-ui-project.sh` | The builder, in the Build list as **Material UI (React app)**, installed into every sites folder |
| `scripts/functions/fun-material-ui.sh` | The bash functions behind it, sourced by bootstrap once installed; the names the core's tools look for, the plugin's name with its dash as an underscore (`set_material_ui_users`, `add_material_ui_users`, `cancel_material_ui_users`, `testing_configure_material_ui`) |
| `scripts/args/arg-material-ui.sh` | Its argparse; the Build form draws the builder's flags from it |
| `testing/site.feature` | The first feature the demo template gets when testing is set up |
| `ai/agents/material-ui-app-builder.md` | The agent that builds and fixes apps: the build in the container, names a person reads |
| `ai/agents/material-ui-tester.md` | The agent that writes and runs scenarios with the step pack |
| `ai/skills/material-ui-scenarios/` | The skill: the step pack's phrases, the traps found on Material UI's templates and on a real app, three example features |
| `ai/commands/material-ui-test.md` | The slash command `/material-ui-test <app>`: set up when missing, match every step, run, report |
| `ai/prompts/material-ui-build-and-test.md`, `material-ui-scenarios-for-an-app.md` | Two prompts: whole launch commands for a new session |
| `src/index.ts` | `register(api)`: what the assistant is told about Material UI here |
| `features/material-ui.feature`, `features/material-ui-runtimes.feature` | Scenarios for the dashboard's own browser suite |

The `workspacePlugin` block in `package.json` is the manifest the installer reads.

## What is different from a platform

| | WordPress (a platform) | Material UI |
| --- | --- | --- |
| What is built | A WordPress site | A React app with Material UI: its own Vite starter with the step pack's demo, the starter alone, or a Vite app from its repository, its production build served |
| Project | `--project-type=wordpress` | `--project-type=generic --webserver-type=generic`, no database: Vite's own preview server serves the build |
| The language | PHP, in the container tool's image | Node.js 24 in the app's container: DDEV's web container (`--nodejs-version`) on DDEV; on Docker Compose, Podman and Kubernetes the core's language stack (`rt_stack node 24`, Node.js's own image, and `rt_serve`) |
| Recognised by | The project type | On DDEV a file the builder writes, `.ddev/config.material-ui.yaml` (it also records where the app came from); on another runtime its claim, `platform: material-ui` in the `x-webship` block of `compose.yaml` |
| Accounts | WP-CLI | None of the workspace's: `--add-users` is taken and adds nothing |
| Testing | The WordPress pack | The Material UI pack, which finds dialogs, side panels, menus, lists, panels, tabs, notifications and tables by the names a person reads, and waits for each component's own state and the end of its transitions |

## The commands

Run it from a sites folder. `--help` is safe.

### Build and serve an app

```bash
cd ~/workspace/dev
bash cmd-material-ui-project.sh muiapp --install                      # a new app: the starter with the step pack's demo
bash cmd-material-ui-project.sh muimin --install --template minimal   # Material UI's starter alone: one page
bash cmd-material-ui-project.sh muiadmin --install --source https://github.com/marmelab/react-admin --ref v5.15.7 --path examples/demo --vite-build
bash cmd-material-ui-project.sh muiapp --install --runtime docker     # on Docker Compose instead of DDEV
bash cmd-material-ui-project.sh muiapp --install --runtime kubernetes # on the workspace's Kubernetes cluster
```

| Flag | What it does |
| --- | --- |
| `--install` | Serve the built app and check that it answers at its address (`https://<name>.ddev.site` on DDEV) |
| `--runtime ddev\|docker\|podman\|kubernetes` | The container runtime to build on (default: DDEV, or `container.runtime` of `settings.yml`); see [Runtimes](#runtimes) |
| `--template demo\|minimal` | The template a new app is made from (default: `demo`, the starter with the step pack's demo; `minimal`, the starter alone) |
| `--source <git url>` | A repository of a Material UI app built with Vite, instead of a new one |
| `--ref <branch or tag>` | A branch or a tag of that repository (default: its default branch) |
| `--path <folder>` | The folder of the app in that repository, for a repository of several apps: only that folder is checked out |
| `--vite-build` | Build an app of your own with Vite alone (`vite build`) instead of its own build script, for a script that needs more of its repository than the app's folder |
| `--add-users` | Taken so that every builder accepts the same flags; the app has no accounts of the workspace's |
| `--launch` | Open the app in a browser when it is ready |

The builder deletes a project of the same name first, then makes a container with Node.js, makes the app in it (or
copies it from its repository), installs its packages, builds it, and with `--install` checks that its server answers
at the app's address.

**The build.** The demo and the starter alone are built by Vite (`vite build`); the starter's own script runs a type
check first (`tsc -b && vite build`), which you can run in the container (`npx tsc -b`). An app of your own is built with
its own build script (`npm run build`, or pnpm's or yarn's), which may do more than Vite: code generation, its
environment. `--vite-build` builds it with Vite alone, for a script that needs more of its repository than the app's
folder. react-admin's demo is one: built from its folder, its type check meets `TS2578: Unused '@ts-expect-error'
directive` in `src/layout/Layout.tsx` (its monorepo's types are not there), and Vite alone builds it fine. A build that
fails says so, and names `--vite-build`.

**The demo template** is the demo of the step pack, taken from its npm package at the release the builder pins
(`@webship-js/material-ui-steps` 2.0.0) and assembled by the pack's own script (`demo-src/assemble.sh`), as the pack's
CI assembles it: Material UI 9.6.0's own Vite starter, with Material UI's free templates copied in unchanged (sign-in,
sign-in side, sign-up, checkout, dashboard, marketing page, blog and CRUD dashboard) and a page of its documentation's
demos (`/components`: a dialog, a side panel, a menu, a select list, a search list, panels, tabs, a tooltip, a
notification, alerts, a spinner, a progress bar, a badge, chips, a pagination, breadcrumbs and a stepper), installed
from the demo's own lock. The demo the builder makes is the one that release's features were proven on. Material UI's
code, templates and documentation demos are MIT, by Call-Em-All and the MUI contributors; they are fetched in the
container at each build.

**The minimal template** is Material UI's own Vite starter alone (`examples/material-ui-vite-ts` of Material UI 9.6.0),
its one page as it ships. The starter asks for the latest of each package; the builder pins them to the versions of
the step pack's demo (React 19.3.1, Material UI 9.6.0, Vite 8.4.0, TypeScript 7.0.2), so two builds install the same.
It loads Roboto from Google Fonts, as it ships.

**An app of your own** must be a Material UI app built with Vite, whose packages are its own:

- **Its package manager** is read from its lock file: npm (`package-lock.json`, or none), pnpm or yarn, the last two
  through Node.js's corepack. One installed with Bun is refused, with a message.
- **A folder of a repository of several apps** (`--path`) with no lock file of its own is installed with npm as npm 6
  did (`--legacy-peer-deps`): its repository resolved its packages as a whole, and npm's own resolution would add the
  newest release each peer range allows beside the app's. react-admin's demo would get Material UI's utilities 9 beside
  its Material UI 7, and its build would fail.
- **Its packages in `node_modules`:** Vite builds and serves the app from there. An install that leaves none (Yarn's
  Plug'n'Play) is refused, with a message: set `nodeLinker: node-modules` in its `.yarnrc.yml`.
- **Its build:** its own build script, or Vite alone with `--vite-build`; either must leave Vite's production build
  in `dist/` (`dist/index.html`). A build that leaves none (another `outDir`) stops with a message.
- **Refused, with a message:** an app that is not a Material UI app (`@mui/material` is not in its `package.json`), one
  not built with Vite, and one that takes packages of a workspace of its repository (`"workspace:"` in its
  `package.json`).

react-admin's e-commerce demo, "Posters Galore" (`examples/demo` of [react-admin](https://github.com/marmelab/react-admin)
5.15.7, MIT, by Marmelab, on Material UI 7.3 with its own fake API in the browser), built with `--vite-build` as above,
is the example of `--source`, and the second site the step pack's own suite runs on.

The project's folder holds the app's source in `app/` and its production build in `app/dist/`. After a change to the
app, build it again in the container the way the builder did (`npx vite build` for the demo, the starter and
`--vite-build`; `npm run build` for an app of your own) and restart the project, so its server serves the new build:

```bash
cd ~/workspace/dev/muiapp
ddev exec -d /var/www/html/app "npx vite build"
ddev restart
```

**The address.** Vite's preview server answers only the host names it allows: `localhost` and every IP address. On
DDEV the builder adds the project's own host name (`<name>.ddev.site`) to the daemon's command through Vite's
`__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`, and `--install` checks that the address is answered rather than refused
(Vite's 403 "Blocked request"). The addresses of Docker Compose, Podman and Kubernetes are IP addresses, which Vite
answers by itself.

### Test an app

```bash
bash cmd-tools-testing.sh muiapp                                  # webship-js, the step pack, a first feature
bash cmd-tools-testing.sh muiapp --run --path tests/features/site.feature
```

The testing setup adds `@webship-js/material-ui-steps` to the project, lists its step definitions in `cucumber.js`,
and, for the demo template, writes `tests/features/site.feature`. An app of your own gets no first feature: it has its
own names. It changes nothing in a project that is not an app of this builder.

The steps find each component the way a person reads it (a dialog by its title, a field and a list by its label, a row
by a text it shows) and wait for what the component says: its role, its classes, the end of its transitions; never a
fixed time.

```gherkin
Feature: Reset a password
  Scenario: The dialog asks for the address, then closes
    Given I go to "/sign-in"
    When I open the "Reset password" dialog with the "Forgot your password?" button
    Then the "Reset password" dialog should show "Enter your account's email address"
    When I press "Cancel" in the "Reset password" dialog
    Then the "Reset password" dialog should not be shown
```

### Runtimes

The commands are the same on every runtime: the builder speaks DDEV's verbs, and on another runtime the core's layer
(Webship Workspace 1.0.32 or later, webship/workspace#694 and #841) gives each verb its meaning there: the language
stack builds the web image from Node.js's own image at version 24 and starts the app's server in it. The app has no
database, so on Kubernetes it needs core 1.0.35 or newer (webship/workspace#884).

| Runtime | The address of the app | Proven with this builder |
| --- | --- | --- |
| DDEV (the default) | `https://<name>.ddev.site` | The demo template built and served in 1 min 38 s (Node.js 24 in DDEV's web container: `@webship-js/material-ui-steps` 2.0.0 from npm, its assemble script at Material UI 9.6.0, `npm ci` from the demo's lock, `vite build`), answering 200 at its root and at a deep path, drawn in 203 ms; the testing setup from npm (`@webship-js/material-ui-steps` 2.0.0, webship-js 2.0.19) and its first feature (4 scenarios, 20 steps), and the skill's examples for the demo: its components (4 scenarios, 24 steps) and its templates (4 scenarios, 20 steps). react-admin's demo (`--source https://github.com/marmelab/react-admin --ref v5.15.7 --path examples/demo --vite-build`: Material UI 7.3.11, npm with `--legacy-peer-deps`) in 2 min 15 s, at its `.ddev.site` address, drawn in 1.8 s; without `--vite-build` its own build script stops at its type check (TS2578) and the builder names `--vite-build` |
| Docker Compose (`--runtime docker`) | `http://127.0.0.1:<port>`, a free port kept in `compose.yaml` | The demo template (the one CI builds for the features) built in 39 s, its files the host user's, drawn in 245 ms; the testing setup and its first feature (4 scenarios, 20 steps); react-admin's demo with `--vite-build` in 1 min 55 s, drawn in 690 ms |
| Podman (`--runtime podman`) | `http://127.0.0.1:<port>` | The starter alone (`--template minimal`) built in 1 min 41 s with Node.js's own image, its packages pinned to the demo's (Material UI 9.6.0, React 19.3.1, Vite 8.4.0, TypeScript 7.0.2), its files the host user's, drawn in 425 ms; the testing setup (no first feature: not the demo) and the skill's starter example (1 scenario, 5 steps); react-admin's demo with `--vite-build` in 2 min 57 s, drawn in 519 ms |
| Kubernetes (`--runtime kubernetes`) | `http://<node address>:<NodePort>` | On kind: the demo template built in 1 min 43 s with Node.js's own image, served at the node's address and a NodePort, its files the host user's, drawn in 205 ms; the plugin's features on the dashboard with the Docker Compose, Podman and Kubernetes apps up; react-admin via `--source` on Kubernetes: not yet run (webship/workspace#963) |

A project of the builder is known by DDEV's file on DDEV and by its claim on another runtime, so the testing setup,
the Users tools (which say there are no accounts) and the dashboard's row work the same on each. Lando and Docksal are
runtimes of the workspace too, not proven with this builder yet: it says so and stops, before anything is made.

### Users

The app has no accounts of the workspace's. `cmd-tools-add-users.sh <name> material_ui` and
`cmd-tools-cancel-users.sh <name> material_ui` say so and change nothing.

## The AI items

| Item | Kind | What it is for |
| --- | --- | --- |
| `material-ui-app-builder` | agent | Builds and fixes Material UI apps in their container: the build, names a person reads |
| `material-ui-tester` | agent | Writes and runs scenarios with the step pack: looks at the pages in the browser first, never sleeps, never names a framework or platform in a step |
| `material-ui-scenarios` | skill | The step pack's phrases, the traps found on Material UI's templates and on a real app, three example features that pass on the demo template and on the starter alone |
| `/material-ui-test <app>` | command | Sets the pack up when missing, matches every step, runs, reports |
| `material-ui-build-and-test` | prompt | Builds an app and proves it with its first feature |
| `material-ui-scenarios-for-an-app` | prompt | Writes and runs the scenarios of one page of an app of the workspace |

Every item says the workspace is container-based (DDEV by default), and the agents and the skill send the reader to
the book *Automated Functional Testing Recipes* first.

## Develop it

```bash
npm install
npm test        # builds, then the unit tests: the manifest, the scripts, the AI items, the needs
npm run lint    # the TypeScript compiler, no output
```

CI runs the same on Node.js 24 and 26, checks that every shell script parses, and runs the plugin's webship-js
features against a dashboard with the plugin installed (the reusable workflow
`webship/workspace/.github/workflows/plugin-browser-suite.yml`). Before the features it builds the app the manifest
names (`featuresSite`: `cmd-material-ui-project.sh ci-material-ui --install --runtime docker`), so the scenarios of
`features/material-ui-runtimes.feature` tagged `@needs-runtime-docker` drive a real app on Docker Compose; the Podman
and Kubernetes ones run where such an app is.
`tests/fixtures/step-definitions.txt` holds the step definitions of the step pack at the version the testing hook pins
and of webship-js, read from their packages: every phrase an AI item shows must match one of them. Refresh it with
`node tests/fixtures/refresh-step-definitions.js` from a project whose testing stack is set up.

## License

ISC (see `LICENSE`).

## Logo

The logo is MUI's own mark, `docs/public/static/logo.svg` of github.com/mui/material-ui v9.6.0, unmodified. MUI and its
logo are MUI's: the logo names the framework the plugin builds apps with. It is not covered by this package's licence.
