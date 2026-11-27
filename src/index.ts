/**
 * Material UI for Webship Workspace: a plugin for apps built with Material UI, MUI's React components.
 *
 * What the package carries is placed by the installer from the manifest: the builder in the sites
 * folders, its functions, argparse and machine files (a first feature) under
 * core/scripts/plugins/material-ui/, its AI items (ai/) in the AI folders. The builder makes an app
 * with Material UI's own Vite starter (with the Material UI step pack's demo by default: its free
 * templates and documentation demos) or takes one from its repository, builds it and serves its
 * production build from a container of its own with Vite's own preview server: Node.js, the app's
 * language, runs in the app's container, never on the machine. The step pack
 * (@webship-js/material-ui-steps) goes into the testing setup of such an app with the core's
 * `cmd-tools-testing.sh <project>`. The dashboard needs nothing drawn for it: the builder is in the
 * Build list because it is a cmd-*-project.sh, the row menus are the core's, the AI items are listed
 * like any other. What register() adds is what the assistant is told.
 *
 * Everything the dashboard is asked for goes through `api`; this package requires nothing from the
 * dashboard's own files, so it can be installed from npm and removed without a trace.
 */

import type { PluginApi } from '@webship.co/workspace-plugin-api';

/** The plugin's name, which its functions are named after (its dash as an underscore: material_ui_*). */
export const PLATFORM = 'material-ui';

/** The commands the installer places in every sites folder. */
export const COMMANDS = ['cmd-material-ui-project.sh'];

/** The agents the installer places in the AI Agents folder. */
export const AGENTS = ['material-ui-app-builder', 'material-ui-tester'];

/** The skill the installer places in the AI Skills folder (a folder each, with its SKILL.md). */
export const SKILLS = ['material-ui-scenarios'];

/** The slash command the installer places in the AI Commands folder. */
export const AI_COMMANDS = ['material-ui-test'];

/** The prompts the installer places in the AI Prompts folder: whole launch commands for a new session. */
export const PROMPTS = ['material-ui-build-and-test', 'material-ui-scenarios-for-an-app'];

/** What the assistant is told about Material UI in this workspace. */
export function assistantContext(): string {
  return [
    'Material UI (a plugin, @webship.co/workspace-material-ui): its builder makes a Material UI app and serves it from a container',
    'of its own, with `bash cmd-material-ui-project.sh <name> --install` from a sites folder (dev, test, sandboxes, demos): the app',
    'is Material UI\'s own Vite starter (pinned) with the demo of the Material UI step pack, its free templates and documentation',
    'demos (--template minimal for the starter alone, or a Vite app of your own with --source, --ref and --path, built with its',
    'own build script or with Vite alone on --vite-build: react-admin\'s e-commerce demo is the example, with --vite-build), built',
    'in the app\'s container, where Node.js runs, and its production build served by',
    'Vite\'s own preview server at https://<name>.ddev.site. The app\'s source is in <name>/app/. There is no database, and the app',
    'has no accounts of the workspace\'s. `--runtime docker`, `podman` or `kubernetes` builds it on Docker Compose, Podman or a',
    'Kubernetes cluster instead of DDEV, at the address that runtime gives (the build prints it).',
    '`bash cmd-tools-testing.sh <name>` sets up webship-js with the step pack @webship-js/material-ui-steps on such an app: its steps',
    'find dialogs, side panels, menus, select lists, panels, tabs, notifications and tables the way a person reads them, and wait',
    'for each component\'s own state and the end of its transitions, never a fixed time.',
    `For building or fixing a Material UI app (its build, its server), hand over to the agent \`${AGENTS[0]}\`; for testing one, to \`${AGENTS[1]}\`.`,
    `The plugin also places the skill ${SKILLS.map((a) => `\`${a}\``).join(', ')} (the step pack's phrases) in ai-skills/,`,
    `the command ${AI_COMMANDS.map((a) => `\`/${a} <app>\``).join(', ')} in ai-commands/ and the prompts ${PROMPTS.map((a) => `\`${a}\``).join(' and ')} in ai-prompts/.`,
    'Never run node, npm or npx on the host for a project.',
  ].join(' ');
}

export function register(api: PluginApi): void {
  api.addAssistantContext(assistantContext);
}
