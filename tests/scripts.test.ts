import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

// Compiled, these tests run from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const FUNCTIONS = path.join(PKG, 'scripts', 'functions', 'fun-material-ui.sh');
const read = (f: string) => fs.readFileSync(path.join(PKG, f), 'utf8');

// The cucumber.js webship-js scaffolds, as far as the testing hook reads it.
const SCAFFOLD = `module.exports = {
  default: {
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',          // Webship-js core step definitions.
      'tests/step-definitions/**/*.js',                                  // Your custom step definitions.
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://localhost:8080',
    },
  },
};
`;

// A playwright.config.ts of an older scaffold: the hook has no reason to change it, so it stays as it is.
const PLAYWRIGHT = `const chromiumArgs: string[] = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-web-security',
];
`;

/** A project folder with the testing stack scaffolded, and the tooling folder the installer would have filled. */
function project(kind: 'demo' | 'own' | 'drupal') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'material-ui-plugin-'));
  const dir = path.join(root, 'dev', 'app1');
  fs.mkdirSync(path.join(dir, '.ddev'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ddev', 'config.yaml'), `name: app1\ntype: ${kind === 'drupal' ? 'drupal11' : 'generic'}\n`);
  if (kind !== 'drupal') {
    fs.writeFileSync(path.join(dir, '.ddev', 'config.material-ui.yaml'), '# A Material UI app in this project.\n');
    fs.mkdirSync(path.join(dir, 'app', 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'app', 'src', 'App.tsx'), 'export default function App() { return null; }\n');
    if (kind === 'demo') {
      fs.writeFileSync(path.join(dir, 'app', 'src', 'ComponentsPage.tsx'), 'export default function ComponentsPage() { return null; }\n');
      fs.mkdirSync(path.join(dir, 'app', 'src', 'templates', 'sign-in'), { recursive: true });
    }
  }
  fs.writeFileSync(path.join(dir, 'cucumber.js'), SCAFFOLD);
  fs.writeFileSync(path.join(dir, 'playwright.config.ts'), PLAYWRIGHT);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app1', devDependencies: { 'webship-js': '^2.0.18' } }, null, 2));
  const scripts = path.join(root, 'core', 'scripts');
  fs.mkdirSync(path.join(scripts, 'plugins', 'material-ui'), { recursive: true });
  fs.copyFileSync(path.join(PKG, 'testing', 'site.feature'), path.join(scripts, 'plugins', 'material-ui', 'site.feature'));
  return { root, dir, scripts };
}

/** Run bash with the plugin's functions sourced and `ddev` replaced by a recorder. */
function bash(script: string, env: Record<string, string> = {}) {
  const fake = 'ddev() { echo "ddev $*" >> "${DDEV_LOG:-/dev/null}" ; return 0 ; }';
  return spawnSync('bash', ['-c', `${fake}\nsource ${FUNCTIONS}\n${script}`], { encoding: 'utf8', env: { ...process.env, ...env } });
}

test('the app has no accounts of the workspace: the list is empty, and adding or removing them says so', () => {
  let r = bash('set_material_ui_users ; echo "${#users[@]}"');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout.trim(), '0');
  r = bash('add_material_ui_users ; cancel_material_ui_users');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /no accounts of the workspace's, so there are none to add/);
  assert.match(r.stdout, /no accounts of the workspace's, so there are none to remove/);
});

const hook = (p: { dir: string; root: string; scripts: string }) =>
  bash(`cd ${p.dir} && testing_configure_material_ui ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'app1' });

test('the testing hook adds the step pack and, for the demo template, a first feature, once', () => {
  const p = project('demo');
  const r = hook(p);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const pkg = JSON.parse(fs.readFileSync(path.join(p.dir, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.devDependencies['@webship-js/material-ui-steps'], '^2.0.0');
  assert.strictEqual(pkg.devDependencies['webship-js'], '^2.0.18', 'what was there stays');
  const cucumber = fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8');
  const lines = cucumber.split('\n');
  const core = lines.findIndex((l) => l.includes('node_modules/webship-js/tests/step-definitions'));
  assert.strictEqual(lines[core + 1], "      'node_modules/@webship-js/material-ui-steps/tests/step-definitions/*.js',", 'the pack is listed right after webship-js');
  const loaded = spawnSync(process.execPath, ['-e', `const c = require(${JSON.stringify(path.join(p.dir, 'cucumber.js'))}).default; console.log(JSON.stringify([c.require.length, c.paths]))`], { encoding: 'utf8' });
  assert.strictEqual(loaded.status, 0, loaded.stderr);
  assert.deepStrictEqual(JSON.parse(loaded.stdout), [3, ['tests/features/**/*.feature']]);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'playwright.config.ts'), 'utf8'), PLAYWRIGHT, 'the browser\'s arguments are the project\'s');
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'utf8'), read('testing/site.feature'));
  assert.match(r.stdout, /tests\/features\/site\.feature: a first feature for the demo/);
  // Again, after a person changed the feature: nothing is doubled, nothing is reset.
  fs.writeFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'Feature: mine\n');
  const again = hook(p);
  assert.strictEqual(again.status, 0);
  assert.doesNotMatch(again.stdout, /package\.json:|cucumber\.js:|tests\/features\/site\.feature:/, 'a second run adds nothing');
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), cucumber);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'utf8'), 'Feature: mine\n');
});

test('an app of your own gets the step pack, and no first feature: it has its own names', () => {
  const p = project('own');
  const r = hook(p);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), /@webship-js\/material-ui-steps\/tests\/step-definitions/);
  assert.ok(!fs.existsSync(path.join(p.dir, 'tests', 'features', 'site.feature')));
  assert.match(r.stdout, /the app is not the demo template, so no first feature is written/);
});

test('the testing hook waits for the testing stack: without cucumber.js it says to run the setup again', () => {
  const p = project('demo');
  fs.rmSync(path.join(p.dir, 'cucumber.js'));
  const r = hook(p);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /cucumber\.js is not here yet/);
});

test('the testing hook leaves any other project alone', () => {
  const p = project('drupal');
  const r = hook(p);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), SCAFFOLD);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'playwright.config.ts'), 'utf8'), PLAYWRIGHT);
  assert.ok(!fs.existsSync(path.join(p.dir, 'tests')));
});

const SERVE = 'while [ ! -f /var/www/html/app/dist/index.html ]; do sleep 2; done; cd /var/www/html/app && exec npx --no-install vite preview --host 0.0.0.0 --port 4173 --strictPort';
// On DDEV the router asks for the project's host name, which Vite's preview server allows only when it is told to.
const SERVE_DDEV = 'while [ ! -f /var/www/html/app/dist/index.html ]; do sleep 2; done; cd /var/www/html/app && exec env __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=app1.ddev.site npx --no-install vite preview --host 0.0.0.0 --port 4173 --strictPort';

test('the app\'s server waits for the build and serves it with Vite\'s own preview server on its port, the DDEV host name allowed', () => {
  let r = bash('material_ui_serve_command');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout.trim(), SERVE, 'an IP address (Docker Compose, Podman, Kubernetes) Vite answers by itself');
  r = bash('material_ui_serve_command app1.ddev.site');
  assert.strictEqual(r.stdout.trim(), SERVE_DDEV);
  for (const out of [SERVE, SERVE_DDEV]) {
    assert.doesNotMatch(out, / ;/, 'no " ;", which starts a comment in the supervisor configuration DDEV writes from it');
    assert.doesNotMatch(out, /[$'"]/, 'no $ and no quote: written as it is, read by no one before the container');
  }
  assert.strictEqual(bash('material_ui_host_of https://app1.ddev.site').stdout.trim(), 'app1.ddev.site');
  assert.strictEqual(bash('material_ui_host_of http://127.0.0.1:43210').stdout.trim(), '127.0.0.1');
});

test('on DDEV the router sends the address to the app\'s server, a daemon that waits for the build', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'material-ui-ddev-'));
  const r = bash(`material_ui_write_ddev_config ${root} "Material UI 9.6.0's Vite starter" app1.ddev.site`);
  assert.strictEqual(r.status, 0, r.stderr);
  const yaml = fs.readFileSync(path.join(root, '.ddev', 'config.material-ui.yaml'), 'utf8');
  assert.match(yaml, /web_extra_exposed_ports:\n  - name: material-ui\n    container_port: 4173\n    http_port: 80\n    https_port: 443/);
  assert.ok(yaml.includes(`web_extra_daemons:\n  - name: material-ui\n    command: "bash -c '${SERVE_DDEV}'"\n    directory: /var/www/html`), yaml);
  assert.doesNotMatch(yaml.split('command: ')[1].split('\n')[0], / ;/, 'no " ;" in the daemon\'s command');
  assert.match(yaml, /^# app: Material UI 9\.6\.0's Vite starter$/m);
  assert.ok(!fs.existsSync(path.join(root, '.ddev', 'web-build')), 'the web image is DDEV\'s own: Node.js comes with the project\'s nodejs_version');
});

// Material UI's Vite starter (examples/material-ui-vite-ts), as far as the builder reads it: it asks for the latest of
// each package.
const STARTER = {
  name: 'material-ui-vite-ts', private: true, type: 'module', scripts: { dev: 'vite', build: 'tsc -b && vite build', preview: 'vite preview' },
  dependencies: { '@emotion/react': 'latest', '@emotion/styled': 'latest', '@mui/icons-material': 'latest', '@mui/material': 'latest', react: 'latest', 'react-dom': 'latest' },
  devDependencies: { '@types/react': 'latest', '@types/react-dom': 'latest', '@vitejs/plugin-react': 'latest', typescript: 'latest', vite: 'latest' },
};
// The pack's demo (demo-src/package.json), as far as the builder reads it: a version of every package, and more.
const DEMO = {
  name: 'material-ui-demo', scripts: { build: 'vite build', preview: 'vite preview' },
  dependencies: { '@emotion/react': '11.14.0', '@emotion/styled': '11.14.1', '@mui/icons-material': '9.6.0', '@mui/material': '9.6.0', '@mui/x-data-grid': '9.18.0', react: '19.3.1', 'react-dom': '19.3.1' },
  devDependencies: { '@types/react': '19.3.3', '@types/react-dom': '19.3.0', '@vitejs/plugin-react': '6.3.0', typescript: '7.0.2', vite: '8.4.0' },
};

test('the starter\'s packages are pinned to the versions of the pack\'s demo, and a package the demo has no version of stops it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'material-ui-pin-'));
  fs.writeFileSync(path.join(dir, 'demo.json'), JSON.stringify(DEMO));
  const script = bash('material_ui_pin_script').stdout.trim();
  assert.doesNotMatch(script, /'/, 'no single quote: the container\'s shell takes it in single quotes');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(STARTER));
  let r = spawnSync(process.execPath, ['-e', script, path.join(dir, 'demo.json')], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const pinned = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  assert.deepStrictEqual(pinned.dependencies, { '@emotion/react': '11.14.0', '@emotion/styled': '11.14.1', '@mui/icons-material': '9.6.0', '@mui/material': '9.6.0', react: '19.3.1', 'react-dom': '19.3.1' });
  assert.deepStrictEqual(pinned.devDependencies, { '@types/react': '19.3.3', '@types/react-dom': '19.3.0', '@vitejs/plugin-react': '6.3.0', typescript: '7.0.2', vite: '8.4.0' });
  assert.deepStrictEqual(pinned.scripts, STARTER.scripts, 'the rest of the starter stays as it is');
  assert.ok(!('@mui/x-data-grid' in pinned.dependencies), 'no package of the demo is added');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ ...STARTER, dependencies: { ...STARTER.dependencies, 'left-pad': 'latest' } }));
  r = spawnSync(process.execPath, ['-e', script, path.join(dir, 'demo.json')], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /The demo has no version of left-pad/);
});

/** A build of app1 in a fresh workspace folder, with `ddev` and the core's helpers recorded; `layer` stands for the
 * core's runtime layer (fun-runtime.sh), as far as the builder asks it. The recorder makes the files the commands in
 * the container would: the assembled demo, the starter, the copied app (its package.json from PKGJSON, its lock file
 * LOCK), its install (Vite in node_modules, none with NOVITE), the build (none with NOOUTPUT). */
function build(opts: { layer?: string; env?: Record<string, string> } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'material-ui-build-'));
  fs.mkdirSync(path.join(root, 'dev'), { recursive: true });
  const scripts = path.join(root, 'core', 'scripts');
  fs.mkdirSync(path.join(scripts, 'plugins', 'material-ui'), { recursive: true });
  const log = path.join(root, 'ddev.log');
  const app = path.join(root, 'dev', 'app1', 'app');
  const script = [
    'trim_project_name() { :; } ; drop_database() { :; } ; ddev_up() { ddev "$@" ; } ; ddev_nodejs_version() { echo 24 ; }',
    `ddev() { echo "ddev $*" >> ${log} ; case "$*" in`,
    `  *"demo-src/assemble.sh /var/www/html/app"*) mkdir -p ${app}/src/templates/sign-in && touch ${app}/src/ComponentsPage.tsx ${app}/package-lock.json && echo '{"dependencies":{"@mui/material":"9.6.0","vite":"8.4.0"}}' > ${app}/package.json ;;`,
    `  *"sparse-checkout set examples/material-ui-vite-ts"*) mkdir -p ${app}/src && echo '{"dependencies":{"@mui/material":"latest"},"devDependencies":{"vite":"latest"}}' > ${app}/package.json ;;`,
    `  *"cp -a '/tmp/material-ui-source/"*) mkdir -p ${app} && printf '%s' "$PKGJSON" > ${app}/package.json && { [ -z "$LOCK" ] || touch ${app}/$LOCK ; } ;;`,
    `  *" install"|*" install --legacy-peer-deps") [ -n "$NOVITE" ] || { mkdir -p ${app}/node_modules/.bin && touch ${app}/node_modules/.bin/vite ; } ;;`,
    `  *"vite build"*|*" run build"*) [ -n "$BUILDFAIL" ] && return 1 ; [ -n "$NOOUTPUT" ] || { mkdir -p ${app}/dist && touch ${app}/dist/index.html ; } ;;`,
    `  *"-H 'Host: "*) echo "\${HOSTCODE:-200}" ;;`,
    'esac ; return 0 ; }',
    opts.layer || '',
    'PROJECT_NAME=app1',
    'material_ui_build',
  ].join('\n');
  const r = spawnSync('bash', ['-c', `source ${FUNCTIONS}\n${script}`], { encoding: 'utf8', env: { ...process.env, WORKSPACE_ROOT: root, WORKSPACE_SCRIPTS: scripts, doc_name: 'dev', INSTALL: 'yes', PKGJSON: '', LOCK: '', NOVITE: '', NOOUTPUT: '', BUILDFAIL: '', HOSTCODE: '', VITE_BUILD: '', ...(opts.env || {}) } });
  const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
  return { r, calls, root, log, project: path.join(root, 'dev', 'app1') };
}

const PACK = 'rm -rf /tmp/material-ui-pack && mkdir -p /tmp/material-ui-pack && cd /tmp/material-ui-pack && npm pack --silent @webship-js/material-ui-steps@2.0.0 > /dev/null && tar -xzf ./*.tgz && test -f package/demo-src/assemble.sh';

test('a new app: the demo of the pinned pack, assembled by its own script at the pinned Material UI, installed from its lock, built in the container, served at the project\'s address', () => {
  const b = build();
  assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
  assert.match(b.calls, /^ddev config --project-type=generic --webserver-type=generic --docroot= --project-name=app1 --omit-containers=db --nodejs-version=24$/m);
  assert.ok(fs.readFileSync(path.join(b.project, '.ddev', 'config.material-ui.yaml'), 'utf8').includes(SERVE_DDEV), 'the daemon runs Vite\'s own preview server, the project\'s host name allowed');
  assert.match(b.calls, /^ddev start -y$/m);
  assert.ok(b.calls.includes(`ddev exec -d /var/www/html ${PACK}\n`), b.calls);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html MUI_VERSION=9\.6\.0 bash \/tmp\/material-ui-pack\/package\/demo-src\/assemble\.sh \/var\/www\/html\/app && rm -rf \/tmp\/material-ui-pack$/m);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm ci --no-audit --no-fund$/m);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npx --no-install vite build$/m, 'built by Vite itself');
  const order = ['ddev start', 'npm pack', 'assemble.sh', 'npm ci', 'vite build'].map((s) => b.calls.indexOf(s));
  assert.deepStrictEqual([...order].sort((x, y) => x - y), order, 'made in the container once it runs, assembled, then installed and built');
  assert.match(b.calls, /curl -sS -o \/dev\/null http:\/\/127\.0\.0\.1:4173\//, '--install waits for the app\'s server');
  assert.match(b.calls, /^ddev exec curl -s -o \/dev\/null -w %\{http_code\} -H 'Host: app1\.ddev\.site' http:\/\/127\.0\.0\.1:4173\/$/m, 'and checks that it answers the project\'s own host name');
  assert.match(b.r.stdout, /^Go to https:\/\/app1\.ddev\.site$/m);
  assert.match(b.r.stdout, /dev app1 is served: the Material UI app in app\/ \(the demo of @webship-js\/material-ui-steps 2\.0\.0: Material UI 9\.6\.0's Vite starter with its free templates and documentation demos\)\./);
  assert.doesNotMatch(b.calls, /^ddev stop/m, 'with --install the app stays served');
  assert.doesNotMatch(b.calls, /npm install|@latest|material-ui-source/, 'nothing is installed outside the lock, taken at latest, or cloned from a repository of your own');
});

test('without --install the app is built and the project stopped; --template minimal is the starter alone, its packages pinned to the demo\'s', () => {
  const b = build({ env: { INSTALL: '', TEMPLATE: 'minimal' } });
  assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
  assert.ok(b.calls.includes(`ddev exec -d /var/www/html ${PACK}\n`), 'the pack is taken for the versions of its demo');
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html rm -rf \/tmp\/material-ui-src && git -c advice\.detachedHead=false clone --quiet --depth 1 --branch v9\.6\.0 --filter=blob:none --sparse https:\/\/github\.com\/mui\/material-ui\.git \/tmp\/material-ui-src && git -c advice\.detachedHead=false -C \/tmp\/material-ui-src sparse-checkout set examples\/material-ui-vite-ts && mkdir -p \/var\/www\/html\/app && cp -a \/tmp\/material-ui-src\/examples\/material-ui-vite-ts\/\. \/var\/www\/html\/app\/ && cp \/tmp\/material-ui-src\/LICENSE \/var\/www\/html\/app\/LICENSE\.material-ui && rm -rf \/tmp\/material-ui-src$/m);
  const pin = bash('material_ui_pin_script').stdout.trim();
  assert.ok(b.calls.includes(`ddev exec -d /var/www/html/app node -e '${pin}' /tmp/material-ui-pack/package/demo-src/package.json && rm -rf /tmp/material-ui-pack\n`), 'the starter\'s packages are pinned in the container');
  assert.doesNotMatch(b.calls, /bash \/tmp\/material-ui-pack\/package\/demo-src\/assemble\.sh/, 'no demo is assembled');
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm install --no-audit --no-fund$/m);
  const order = ['npm pack', 'sparse-checkout set examples/material-ui-vite-ts', 'node -e', 'npm install', 'npx --no-install vite build'].map((s) => b.calls.indexOf(s));
  assert.deepStrictEqual([...order].sort((x, y) => x - y), order, 'taken, pinned, installed, then built by Vite (not the starter\'s tsc -b && vite build)');
  assert.match(b.calls, /^ddev stop$/m, 'ddev stop takes no -y');
  assert.match(b.r.stdout, /dev app1 is ready: the Material UI app in app\/ \(Material UI 9\.6\.0's Vite starter\)\./);
  assert.match(b.r.stdout, /Serve it with: cd app1 && ddev start/);
});

test('a build that leaves no dist/index.html stops with a message, and serves nothing', () => {
  const b = build({ env: { NOOUTPUT: '1' } });
  assert.strictEqual(b.r.status, 1);
  assert.match(b.r.stdout, /The build left no app\/dist\/index\.html: the app is not built by Vite into its dist\/ folder/);
  assert.doesNotMatch(b.calls, /curl/, 'nothing is waited for');
});

test('a server that turns the project\'s host name away (Vite\'s 403) fails the build with a message', () => {
  const b = build({ env: { HOSTCODE: '403' } });
  assert.strictEqual(b.r.status, 1);
  assert.match(b.r.stdout, /Vite's preview server turns app1\.ddev\.site away \(403: the host is not among the ones it allows\), so the app's address does not open it\./);
  assert.doesNotMatch(b.r.stdout, /^Go to /m);
});

const OWN = '{"name":"own","scripts":{"build":"tsc && vite build"},"dependencies":{"@mui/material":"^7.0.0","react-admin":"^5.0.0"},"devDependencies":{"vite":"^8.1.5"}}';

test('an app from a repository: only its folder checked out, copied, installed and built with its own package manager and build script; with --vite-build by Vite alone', () => {
  let b = build({ env: { SOURCE: 'https://example.com/apps.git', REF: 'v5.15.7', APP_PATH: 'examples/demo', PKGJSON: OWN } });
  assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
  assert.match(b.calls, /^ddev exec rm -rf \/tmp\/material-ui-source && git -c advice\.detachedHead=false clone --quiet --depth 1 --branch 'v5\.15\.7' --filter=blob:none --sparse 'https:\/\/example\.com\/apps\.git' \/tmp\/material-ui-source && git -c advice\.detachedHead=false -C \/tmp\/material-ui-source sparse-checkout set 'examples\/demo'$/m);
  assert.match(b.calls, /test -f '\/tmp\/material-ui-source\/examples\/demo\/package\.json' && mkdir -p \/var\/www\/html\/app && cp -a '\/tmp\/material-ui-source\/examples\/demo\/\.' \/var\/www\/html\/app\/ && rm -rf \/var\/www\/html\/app\/\.git/);
  assert.doesNotMatch(b.calls, /npm pack|assemble\.sh|mui\/material-ui\.git/, 'no new app is made, and nothing of the pack is taken');
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm install --legacy-peer-deps$/m, 'a folder of a repository of several apps, with no lock: its peers are left to it');
  assert.match(b.r.stdout, /its peers left to it as npm 6 did \(--legacy-peer-deps\): a folder of a repository of several apps, with no lock of its own/);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm run build$/m, 'built with its own build script');
  assert.doesNotMatch(b.calls, /vite build$/m);
  assert.match(b.r.stdout, /Building the app with its own build script: npm run build\./);
  // --vite-build: Vite alone, for a script that needs more of its repository than the app's folder.
  b = build({ env: { SOURCE: 'https://example.com/apps.git', REF: 'v5.15.7', APP_PATH: 'examples/demo', PKGJSON: OWN, VITE_BUILD: 'yes' } });
  assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npx --no-install vite build$/m);
  assert.doesNotMatch(b.calls, / run build$/m);
  assert.match(b.r.stdout, /Building the app with Vite alone \(--vite-build\): vite build, not its build script\./);
  assert.match(fs.readFileSync(path.join(b.project, '.ddev', 'config.material-ui.yaml'), 'utf8'), /^# app: https:\/\/example\.com\/apps\.git \(v5\.15\.7\), examples\/demo\/$/m);
  // The same folder with a lock of its own: npm's own way.
  b = build({ env: { SOURCE: 'https://example.com/apps.git', APP_PATH: 'examples/demo', PKGJSON: OWN, LOCK: 'package-lock.json' } });
  assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm install$/m);
  // A repository that is the app: a whole shallow clone, the .git folder left out of the copy, npm's own way.
  b = build({ env: { SOURCE: 'https://example.com/app.git', PKGJSON: OWN } });
  assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm install$/m);
  assert.match(b.calls, /^ddev exec rm -rf \/tmp\/material-ui-source && git -c advice\.detachedHead=false clone --quiet --depth 1  'https:\/\/example\.com\/app\.git' \/tmp\/material-ui-source$/m);
  assert.match(b.calls, /cp -a '\/tmp\/material-ui-source\/\.' \/var\/www\/html\/app\/ && rm -rf \/var\/www\/html\/app\/\.git/);
  // pnpm and yarn come through corepack, without its prompt.
  for (const [lock, pm] of [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn']]) {
    b = build({ env: { SOURCE: 'https://example.com/app.git', PKGJSON: OWN, LOCK: lock } });
    assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
    assert.match(b.calls, new RegExp(`^ddev exec -d /var/www/html/app COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack ${pm} install$`, 'm'));
    assert.match(b.calls, new RegExp(`^ddev exec -d /var/www/html/app COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack ${pm} run build$`, 'm'));
  }
  // Its build script fails: the message says what --vite-build is for.
  b = build({ env: { SOURCE: 'https://example.com/apps.git', APP_PATH: 'examples/demo', PKGJSON: OWN, BUILDFAIL: '1' } });
  assert.strictEqual(b.r.status, 1);
  assert.match(b.r.stdout, /The app's build failed\.\nIf its build script needs more of its repository than the app's folder \(a type check against the types of a repository of several apps\), build it with Vite alone: --vite-build\./);
  assert.doesNotMatch(b.calls, /curl/, 'nothing is waited for');
});

test('an app that is not a Material UI app, is not built with Vite, takes packages of its repository\'s workspace, needs Bun, or leaves no node_modules stops the build with a message', () => {
  for (const [env, message] of [
    [{ PKGJSON: '{"dependencies":{"react":"^19.0.0"},"devDependencies":{"vite":"^8.0.0"}}' }, /is not a Material UI app \(its package\.json does not list @mui\/material\)/],
    [{ PKGJSON: '{"dependencies":{"@mui/material":"^9.0.0","next":"^16.0.0"}}' }, /is not built with Vite \(its package\.json does not list vite\)/],
    [{ PKGJSON: '{"dependencies":{"@mui/material":"^9.0.0","ui":"workspace:*"},"devDependencies":{"vite":"^8.0.0"}}' }, /takes packages of a workspace of its repository/],
    [{ PKGJSON: OWN, LOCK: 'bun.lock' }, /installed with Bun \(its lock file\), which is not in the app's container/],
  ] as Array<[Record<string, string>, RegExp]>) {
    const b = build({ env: { SOURCE: 'https://example.com/app.git', ...env } });
    assert.strictEqual(b.r.status, 1, JSON.stringify(env));
    assert.match(b.r.stdout, message);
    assert.doesNotMatch(b.calls, / install$|vite build$| run build$/m, 'nothing is installed or built');
  }
  // Installed, but with no node_modules (Yarn's Plug'n'Play): installed, never built.
  const b = build({ env: { SOURCE: 'https://example.com/app.git', PKGJSON: OWN, LOCK: 'yarn.lock', NOVITE: '1' } });
  assert.strictEqual(b.r.status, 1);
  assert.match(b.r.stdout, /The app's packages are not in its node_modules folder \(Yarn's Plug'n'Play\?\), where Vite builds and serves it from: set nodeLinker: node-modules in its \.yarnrc\.yml\./);
  assert.match(b.calls, / install$/m);
  assert.doesNotMatch(b.calls, /vite build$| run build$/m, 'nothing is built');
});

test('--template with --source, an unknown template, --path without --source, a path out of the repository, or a bad project name stop the build before anything is made', () => {
  for (const [env, message] of [
    [{ TEMPLATE: 'minimal', SOURCE: 'https://example.com/app.git' }, /--template makes a new app, and --source takes an app of your own: give one of them\./],
    [{ TEMPLATE: 'dashboard' }, /--template takes demo or minimal/],
    [{ APP_PATH: 'web' }, /--path names a folder of the repository given with --source: give --source too\./],
    [{ VITE_BUILD: 'yes' }, /--vite-build builds an app of your own \(--source\) with Vite alone: the demo and the starter are built with Vite already\./],
    [{ SOURCE: 'https://example.com/app.git', APP_PATH: '../etc' }, /take a repository, a branch or tag, and a folder inside the repository/],
    [{ SOURCE: "https://example.com/app.git'; rm -rf /" }, /take a repository, a branch or tag, and a folder inside the repository/],
  ] as Array<[Record<string, string>, RegExp]>) {
    const b = build({ env });
    assert.strictEqual(b.r.status, 1, JSON.stringify(env));
    assert.match(b.r.stdout, message);
    assert.strictEqual(b.calls, '', 'no ddev command ran');
    assert.ok(!fs.existsSync(b.project), 'no project folder was made');
  }
  const b = spawnSync('bash', ['-c', `source ${FUNCTIONS}\ntrim_project_name() { :; } ; ddev() { echo ran ; } ; PROJECT_NAME=App_1 ; material_ui_build`], { encoding: 'utf8', env: { ...process.env, WORKSPACE_ROOT: os.tmpdir(), doc_name: 'dev' } });
  assert.strictEqual(b.status, 1);
  assert.match(b.stdout, /The project name App_1 must be small letters, digits and dashes/);
  assert.doesNotMatch(b.stdout, /^ran$/m);
});

/** The core's runtime layer, as far as the builder asks it: the runtime, the address, the claim, the stack. */
const layer = (rt: string, url: string) => [
  `runtime_of() { echo ${rt} ; }`,
  `rt_url() { echo ${url} ; }`,
  'rt_claim() { echo "rt_claim $*" >> "$WORKSPACE_ROOT/ddev.log" ; }',
  'rt_stack() { echo "rt_stack $*" >> "$WORKSPACE_ROOT/ddev.log" ; }',
  'rt_web_build() { echo "rt_web_build $*" >> "$WORKSPACE_ROOT/ddev.log" ; cat > /dev/null ; }',
  'rt_serve() { echo "rt_serve $1" >> "$WORKSPACE_ROOT/ddev.log" ; printf "%s\\n" "$2" > "$WORKSPACE_ROOT/serve.txt" ; }',
].join(' ; ');

test('on DDEV the build runs the same commands with the runtime layer as without it', () => {
  const without = build();
  const withLayer = build({ layer: layer('ddev', 'https://app1.ddev.site') });
  for (const b of [without, withLayer]) {
    assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
    assert.doesNotMatch(b.calls, /rt_claim|rt_stack|rt_serve/, 'the language stack is for the other runtimes');
  }
  assert.strictEqual(withLayer.calls.split(withLayer.root).join('ROOT'), without.calls.split(without.root).join('ROOT'), 'the same ddev commands, to the letter');
});

for (const [rt, url] of [['docker', 'http://127.0.0.1:43210'], ['podman', 'http://127.0.0.1:43211'], ['kubernetes', 'http://172.18.0.2:30080']]) {
  test(`on ${rt}: the claim, Node.js's own image at the workspace's version, Vite's own preview server; never a ddev.site`, () => {
    const b = build({ layer: layer(rt, url), env: { RUNTIME: rt } });
    assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
    assert.match(b.calls, /^ddev config --project-type=generic --webserver-type=generic --docroot= --project-name=app1 --omit-containers=db --auto$/m);
    assert.match(b.calls, /^rt_claim material-ui$/m);
    assert.match(b.calls, /^rt_stack node 24$/m);
    assert.match(b.calls, /^rt_serve 4173$/m);
    assert.doesNotMatch(b.calls, /rt_web_build/, 'Node.js\'s image and the stack\'s layer carry all the app needs');
    assert.strictEqual(fs.readFileSync(path.join(b.root, 'serve.txt'), 'utf8').trim(), SERVE, 'an IP address: no host name to allow');
    assert.doesNotMatch(b.calls, /-H 'Host:/, 'and no host name to check');
    assert.ok(!fs.existsSync(path.join(b.project, '.ddev')), 'no .ddev folder: it would make the project a DDEV one');
    assert.ok(b.calls.indexOf('ddev config') < b.calls.indexOf('rt_claim material-ui'), 'the claim comes after the runtime\'s files are written');
    assert.ok(b.calls.includes(PACK), 'the demo is taken in the container, as on DDEV');
    assert.match(b.calls, /assemble\.sh \/var\/www\/html\/app/, 'and assembled the same way');
    assert.match(b.r.stdout, new RegExp(`^Go to ${url.replace(/[.:/]/g, '\\$&')}$`, 'm'));
    assert.doesNotMatch(b.r.stdout, /ddev\.site/, 'no message names a DDEV address');
  });
}

test('--runtime on a core without the runtime layer is refused, and nothing is started', () => {
  const b = build({ env: { RUNTIME: 'docker' } });
  assert.strictEqual(b.r.status, 1);
  assert.match(b.r.stdout, /--runtime docker needs a Webship Workspace with the container runtimes \(webship\/workspace#694\)/);
  assert.strictEqual(b.calls, '', 'no ddev command ran');
  assert.ok(!fs.existsSync(b.project), 'no project folder was made');
});

for (const rt of ['lando', 'docksal']) {
  test(`a runtime this builder is not proven on (${rt}, the workspace's setting) stops the build before anything is made`, () => {
    const b = build({ layer: layer(rt, 'http://127.0.0.1:43212') });
    assert.strictEqual(b.r.status, 1);
    assert.match(b.r.stdout, new RegExp(`builds on DDEV, Docker Compose, Podman and Kubernetes for now \\(--runtime ddev, docker, podman or kubernetes\\), not on ${rt}`));
    assert.strictEqual(b.calls, '', 'no ddev command ran');
    assert.ok(!fs.existsSync(b.project), 'no project folder was made');
  });
}

test('a project of the builder is known by DDEV\'s file, else by the core\'s rt_is_platform', () => {
  let r = bash('rt_is_platform() { echo "asked $*" ; return 0 ; } ; material_ui_is_project /x/app1');
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim(), 'asked /x/app1 material-ui');
  r = bash('rt_is_platform() { return 1 ; } ; material_ui_is_project /x/app1');
  assert.strictEqual(r.status, 1);
  const p = project('demo');
  assert.strictEqual(bash(`material_ui_is_project ${p.dir}`).status, 0, 'without the layer, .ddev/config.material-ui.yaml says so');
  fs.rmSync(path.join(p.dir, '.ddev', 'config.material-ui.yaml'));
  assert.strictEqual(bash(`material_ui_is_project ${p.dir}`).status, 1);
});

test('the package manager of an app is read from its lock file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'material-ui-pm-'));
  const pm = () => bash(`material_ui_package_manager ${dir}`).stdout.trim();
  assert.strictEqual(pm(), 'npm', 'no lock file: npm');
  for (const [lock, wanted] of [['package-lock.json', 'npm'], ['yarn.lock', 'yarn'], ['pnpm-lock.yaml', 'pnpm'], ['bun.lockb', 'pnpm']]) {
    fs.writeFileSync(path.join(dir, lock), '');
    assert.strictEqual(pm(), wanted, lock);
  }
  const bun = fs.mkdtempSync(path.join(os.tmpdir(), 'material-ui-pm-'));
  fs.writeFileSync(path.join(bun, 'bun.lock'), '');
  assert.strictEqual(bash(`material_ui_package_manager ${bun}`).stdout.trim(), 'bun');
  assert.strictEqual(bash('material_ui_pm npm').stdout.trim(), 'npm');
  assert.strictEqual(bash('material_ui_pm pnpm').stdout.trim(), 'COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm');
});

test('the builder takes the runtimes it is proven on and the two templates, and never a flag that would take the name PATH', () => {
  const args = read('scripts/args/arg-material-ui.sh');
  assert.match(args, /choices=\['ddev', 'docker', 'podman', 'kubernetes'\]/);
  assert.match(args, /dest='RUNTIME',\n\s+default="_none_"/);
  assert.match(args, /'--template',\n\s+dest='TEMPLATE',\n\s+default="_none_",\n\s+choices=\['demo', 'minimal'\]/);
  assert.match(args, /'--path',\n\s+dest='APP_PATH',/, '--path would otherwise set PATH');
  assert.match(args, /'--vite-build',\n\s+dest='VITE_BUILD',\n\s+action='store_true',/);
  // A help text is a Python string in single quotes unless it holds one itself.
  for (const help of args.match(/help='[^\n]*/g) || []) assert.match(help, /^help='[^']*'\)?$/, help);
  const src = read('scripts/functions/fun-material-ui.sh');
  assert.match(src, /^readonly MATERIAL_UI_RUNTIMES='ddev docker podman kubernetes';$/m);
  assert.match(src, /^readonly MATERIAL_UI_TEMPLATES='demo minimal';$/m);
});

test('the first feature names no framework or platform in the words of a step', () => {
  const feature = read('testing/site.feature');
  const steps = feature.split('\n').filter((l) => /^\s*(Given|When|Then|And|But) /.test(l));
  assert.ok(steps.length >= 10);
  for (const s of steps) assert.doesNotMatch(s.replace(/"[^"]*"/g, '""'), /material|mui|react|vite|node|drupal|wordpress|joomla/i, s);
});
