import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

import { register, assistantContext, PLATFORM, COMMANDS, AGENTS } from '../src/index';

// Compiled, these tests run from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const read = (f: string) => fs.readFileSync(path.join(PKG, f), 'utf8');
const manifest = JSON.parse(read('package.json')).workspacePlugin;

test('the manifest names the plugin, and every file it names ships', () => {
  assert.strictEqual(manifest.name, PLATFORM);
  const named = [...manifest.commands.files, ...manifest.scripts.functions, ...manifest.scripts.args, ...manifest.scripts.machine,
    ...manifest.ai.agents, ...manifest.ai.skills, ...manifest.ai.commands, ...manifest.ai.prompts, ...manifest.features];
  for (const f of named) assert.ok(fs.existsSync(path.join(PKG, f)), `${f} is in the package`);
  assert.deepStrictEqual(manifest.commands.files.map((f: string) => path.basename(f)), COMMANDS);
  assert.deepStrictEqual(manifest.ai.agents.map((f: string) => path.basename(f, '.md')), AGENTS);
  assert.deepStrictEqual(manifest.commands.types, ['sites'], 'the commands go to sites folders only');
  const files: string[] = JSON.parse(read('package.json')).files;
  for (const f of named) assert.ok(files.includes(f.split('/')[0]), `${f} is published with the package`);
  assert.match(manifest.featuresSite, /^cmd-material-ui-project\.sh ci-material-ui --install --runtime docker$/, 'CI builds the demo on Docker Compose for the features');
});

test('the builder finds the workspace by itself, names its folder, and sources its args from where the installer puts them', () => {
  for (const f of manifest.commands.files) {
    const src = read(f);
    assert.match(src, /^#!\/usr\/bin\/env bash/, `${f} is a bash script`);
    assert.match(src, /WORKSPACE_SCRIPTS="\$\{WORKSPACE_SCRIPTS:-\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)\/\.\.\/core\/scripts" && pwd\)\}"/, `${f} locates the tooling from its own path`);
    assert.match(src, /workspace\.__WORKSPACE__\.settings\.yml/, `${f} loads the settings of the folder it is installed into`);
    assert.match(src, /source \$\{WORKSPACE_SCRIPTS\}\/plugins\/material-ui\/args\/arg-[a-z-]+\.sh \|\| exit 1 ;/, `${f} reads its arguments from the plugin's args`);
    const last = src.trim().split('\n').pop() as string;
    assert.match(read('scripts/functions/fun-material-ui.sh'), new RegExp(`^function ${last.replace(/ ;$/, '')}\\(\\)`, 'm'), `${f} ends by calling a function the plugin defines`);
  }
  assert.match(read('commands/cmd-material-ui-project.sh'), /^# workspace-name: Material UI/m, 'the builder carries the name the Build list shows');
});

test('every shell script parses', () => {
  for (const f of [...manifest.commands.files, ...manifest.scripts.functions, ...manifest.scripts.args]) {
    const r = spawnSync('bash', ['-n', path.join(PKG, f)], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('the functions carry the names the core\'s tools look for (the dash as an underscore), and take the app at a pinned release', () => {
  const src = read('scripts/functions/fun-material-ui.sh');
  for (const fn of ['set_material_ui_users', 'add_material_ui_users', 'cancel_material_ui_users', 'testing_configure_material_ui', 'material_ui_build']) {
    assert.match(src, new RegExp(`^function ${fn}\\(\\) \\{`, 'm'), `${fn} is defined`);
  }
  assert.doesNotMatch(src, /^function (build_material_ui|[a-z_]*material-ui[a-z_-]*)\(\)/m, 'no function is named with a dash, and the core\'s own example is not redefined');
  assert.match(src, /--project-type=generic --webserver-type=generic --docroot=""/, 'the app\'s own server serves the app');
  assert.match(src, /--omit-containers=db/, 'there is no database');
  assert.match(src, /--nodejs-version=\$\(ddev_nodejs_version\)/, 'the app runs the Node.js of the workspace rule');
  assert.match(src, /^readonly MATERIAL_UI_VERSION='9\.6\.0';$/m, 'a release of Material UI');
  assert.match(src, /^readonly MATERIAL_UI_NODE_VERSION='24';$/m, 'Node.js 24, as every build of the workspace');
  assert.match(src, /^readonly MATERIAL_UI_DEMO_PACK_VERSION='\d+\.\d+\.\d+';$/m, 'the demo comes from one release of the pack, pinned');
  assert.match(src, /--branch v\$\{MATERIAL_UI_VERSION\} /, 'the starter is taken at the release tag of Material UI');
  assert.match(src, /npm pack --silent \$\{MATERIAL_UI_STEPS_PACKAGE\}@\$\{MATERIAL_UI_DEMO_PACK_VERSION\}/, 'the demo is taken at the pinned release of the pack');
  assert.match(src, /MUI_VERSION=\$\{MATERIAL_UI_VERSION\} bash \$\{pack\}\/package\/demo-src\/assemble\.sh /, 'and assembled by the pack\'s own script, at the same release of Material UI');
  assert.match(src, /npm ci --no-audit --no-fund/, 'the demo installs from its own lock');
  assert.match(src, /vite preview --host 0\.0\.0\.0 --port \$\{MATERIAL_UI_PORT\} --strictPort/, 'Vite\'s own preview server serves the build');
  assert.match(src, /local build='npx --no-install vite build' ;/, 'Vite builds the demo and the starter, and an app of your own with --vite-build');
  assert.match(src, /build="\$\(material_ui_pm "\$\{pm\}"\) run build" ;/, 'an app of your own is built with its own build script by default');
  assert.doesNotMatch(src, /:latest\b|@latest\b/, 'nothing is taken at latest');
  // The demo and the pack the testing setup installs move together: the release line of the one is the other.
  const demo = src.match(/^readonly MATERIAL_UI_DEMO_PACK_VERSION='([0-9.]+)';$/m)![1];
  assert.match(src, new RegExp(`^readonly MATERIAL_UI_STEPS_VERSION='\\^${demo.replace(/\./g, '\\.')}';$`, 'm'), 'the testing setup takes the release line of the demo');
  assert.doesNotMatch(src, /ddev stop -y/, 'ddev stop takes no -y');
  // Every node tool runs inside `ddev exec`, in the app's container: never at the start of a line of the host's shell.
  for (const line of src.split('\n')) {
    if (/^\s*(npx|npm|node|corepack|vite|git) /.test(line)) assert.fail(`a tool runs on the host: ${line.trim()}`);
  }
});

test('register() adds the assistant context and nothing else', () => {
  const calls: string[] = [];
  const api: any = { name: 'material-ui', addAssistantContext: (fn: () => string) => calls.push(fn()) };
  register(api);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0], assistantContext());
  for (const c of COMMANDS) assert.ok(calls[0].includes(c), `the assistant is told about ${c}`);
  for (const a of AGENTS) assert.ok(calls[0].includes(a), `the assistant is told about ${a}`);
  assert.ok(calls[0].includes('cmd-tools-testing.sh <name>'), 'and how an app gets the step pack');
  assert.ok(calls[0].includes('never a fixed time'), 'and what the steps wait for');
});

test('the docs say container-based, name only what ships, and carry no personal value', () => {
  const docs = ['README.md', ...manifest.ai.agents, 'scripts/functions/fun-material-ui.sh'];
  for (const f of docs) {
    const src = read(f);
    assert.doesNotMatch(src, /DDEV-only/i, `${f}: the workspace is container-based, DDEV by default`);
    assert.doesNotMatch(src, /\/home\/(?!YOUR_USER)[a-z]/, `${f} carries no personal path`);
    const mails = src.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[a-z]{2,}/g) || [];
    for (const m of mails) assert.match(m, /@example\.(com|org)$/, `${f}: ${m} is not an example address`);
  }
  for (const c of COMMANDS) assert.ok(read('README.md').includes(c), `the README lists ${c}`);
});
