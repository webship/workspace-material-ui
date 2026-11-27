#!/usr/bin/env bash

# Material UI for the Webship Workspace: make an app with Material UI's own Vite starter (with the step pack's demo, or
# the starter alone), or take one from its repository, build it and serve it from a container of its own, and wire the
# Material UI step pack into the testing setup of that app.
#
# Placed by `plugins.sh --install material-ui` in core/scripts/plugins/material-ui/functions/, where bootstrap sources
# it after the core's own functions. Everything runs in the project's containers, never on the host: Node.js is the
# app's language and runs in the app's own container, where the app is made (Material UI's starter, taken from its
# release with git), built by Vite (`vite build`) and served from its production build by Vite's own preview server
# (`vite preview`: a static app, every path its index.html).
#   - DDEV (the default): a project with DDEV's generic web server and the Node.js of the workspace rule in its web
#     container; the app's server is a daemon of the web container, and the router sends the project's address to it
#     (.ddev/config.material-ui.yaml).
#   - Docker Compose, Podman and Kubernetes (--runtime docker, podman, kubernetes): the language stack of the core's
#     runtime layer (webship/workspace#841): Node.js's own image at the same major version (rt_stack node), and the
#     app's server as the web container's own (rt_serve); at http://127.0.0.1:<port>, or on Kubernetes (kind) at the
#     node's address and a NodePort, the project's folder mounted from the host. There is no database.
# Lando and Docksal are not proven for it yet: asked for one, the builder says so and changes nothing.
#
# The project's folder: app/ (the app: the demo, the starter alone, or a repository cloned with --source) and
# app/dist/ (its production build, which is served). There is no database.
#
# The container tool has no project type for a Material UI app, so a project of this builder is recognised by its mark
# (.ddev/config.material-ui.yaml on DDEV, `platform: material-ui` in compose.yaml elsewhere), and four names are the
# ones the core's tools look for (the plugin's name, material-ui, with its dash as an underscore):
#   set_material_ui_users          an empty list: the app has no accounts of the workspace's (cmd-tools-add-users.sh)
#   add_material_ui_users          says so, and adds nothing                                   (the same tool)
#   cancel_material_ui_users       says so, and removes nothing                                (cmd-tools-cancel-users.sh)
#   testing_configure_material_ui  the step pack in the testing stack                          (cmd-tools-testing.sh)

# The step pack an app is tested with, and the release line it is required at.
readonly MATERIAL_UI_STEPS_PACKAGE='@webship-js/material-ui-steps';
readonly MATERIAL_UI_STEPS_VERSION='^2.0.0';

# The release of the step pack whose demo (demo-src/: its assemble script and its glue) the demo template takes:
# pinned, so the demo the builder makes is the one that pack's features were proven on.
readonly MATERIAL_UI_DEMO_PACK_VERSION='2.0.0';

# The release of Material UI the starter (and the demo's templates and documentation demos) are taken from.
readonly MATERIAL_UI_VERSION='9.6.0';

# Node.js, the app's language, at the major version of the workspace rule: DDEV's web container on DDEV, the stack's
# image (node:<version>-bookworm-slim) on another runtime.
readonly MATERIAL_UI_NODE_VERSION='24';

# The port the app's server listens on in the web container, and the app's folder.
readonly MATERIAL_UI_PORT='4173';
readonly MATERIAL_UI_APP='app';

# The templates a new app can be made from, and the runtimes an app is built on.
readonly MATERIAL_UI_TEMPLATES='demo minimal';
readonly MATERIAL_UI_RUNTIMES='ddev docker podman kubernetes';

# The app has no accounts of the workspace's: the list is empty.
function set_material_ui_users() {
  users=();
}

# The runtime of the project in this folder, or of a new build (--runtime, else the workspace's setting, else DDEV).
# A core without the runtime layer has DDEV only.
function material_ui_runtime() {
  if declare -f runtime_of > /dev/null ; then runtime_of ; else echo 'ddev' ; fi
}

# The address of the app in this folder: https://<name>.ddev.site on DDEV, http://127.0.0.1:<port> on Docker Compose
# and Podman, the node's address and a port on Kubernetes. Asked after `ddev config`.
function material_ui_url() {
  if declare -f rt_url > /dev/null ; then rt_url ; else echo "https://${PROJECT_NAME}.ddev.site" ; fi
}

# The project's folder in the web container.
function material_ui_root() {
  echo '/var/www/html' ;
}

# Is this folder a project of the Material UI builder? On DDEV the builder leaves .ddev/config.material-ui.yaml in it;
# on another runtime it claims the project (`platform: material-ui` in the x-webship block).
function material_ui_is_project() {
  local project_path="$1";
  [ -f "${project_path}/.ddev/config.material-ui.yaml" ] && return 0 ;
  declare -f rt_is_platform > /dev/null && rt_is_platform "${project_path}" material-ui ;
}

# The command that serves the built app once it is there: Vite's own preview server on MATERIAL_UI_PORT, which serves
# the production build (dist/) and answers every other path with its index.html. Vite answers only the host names it
# allows (localhost, and every IP address: the addresses of Docker Compose, Podman and Kubernetes); a host name given here
# (the project's DDEV address) is added through Vite's __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS, written as it is: the
# command holds no `$`, no quote, and no space before a `;` (in the supervisor configuration DDEV writes from it, " ;"
# starts a comment).
function material_ui_serve_command() {
  local root host="${1:-}" allow='' ; root="$(material_ui_root)" ;
  [ -n "${host}" ] && allow="env __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=${host} " ;
  echo "while [ ! -f ${root}/${MATERIAL_UI_APP}/dist/index.html ]; do sleep 2; done; cd ${root}/${MATERIAL_UI_APP} && exec ${allow}npx --no-install vite preview --host 0.0.0.0 --port ${MATERIAL_UI_PORT} --strictPort" ;
}

# The host name of an address (https://app1.ddev.site → app1.ddev.site).
function material_ui_host_of() {
  local host="${1#*://}" ;
  host="${host%%/*}" ;
  echo "${host%%:*}" ;
}

# What DDEV is told about the app: the router sends the project's address to the app's server, which the web container
# runs as a daemon. The file also marks the project as one of this builder.
function material_ui_write_ddev_config() {
  local project_path="$1" made="$2" host="${3:-}" ;
  mkdir -p "${project_path}/.ddev" || return 1 ;
  cat > "${project_path}/.ddev/config.material-ui.yaml" <<YAMLEOF
# A Material UI app in this project. Written by the Material UI builder of the workspace; build again rather than
# editing by hand. The web container serves no files of its own: the router sends ports 80 and 443 of the project's
# address to the app's server, a daemon of the web container that serves the production build (${MATERIAL_UI_APP}/dist)
# with Vite's own preview server once it is there.
# app: ${made}
web_extra_exposed_ports:
  - name: material-ui
    container_port: ${MATERIAL_UI_PORT}
    http_port: 80
    https_port: 443
web_extra_daemons:
  - name: material-ui
    command: "bash -c '$(material_ui_serve_command "${host}")'"
    directory: $(material_ui_root)
YAMLEOF
}

# On another runtime than DDEV (webship/workspace#841): the plugin's claim, Node.js's own image as the stack, and the
# app's server as the web container's own, once the app is built.
function material_ui_runtime_config() {
  rt_claim material-ui || return 1 ;
  rt_stack node "${MATERIAL_UI_NODE_VERSION}" || return 1 ;
  rt_serve "${MATERIAL_UI_PORT}" "$(material_ui_serve_command)" ;
}

# Wait until the app's server answers (any answer of HTTP: an app of your own may ask for a sign-in at its root); with a
# host name (the project's DDEV address), check that the server does not turn that name away (Vite's 403 "Blocked
# request").
function material_ui_wait() {
  local host="${1:-}" attempt code ;
  for attempt in $(seq 1 60) ; do
    if ddev exec "curl -sS -o /dev/null http://127.0.0.1:${MATERIAL_UI_PORT}/" < /dev/null > /dev/null 2>&1 ; then
      [ -z "${host}" ] && return 0 ;
      code="$(ddev exec "curl -s -o /dev/null -w %{http_code} -H 'Host: ${host}' http://127.0.0.1:${MATERIAL_UI_PORT}/" < /dev/null 2> /dev/null)" ;
      [ "${code}" != '403' ] && return 0 ;
      echo "Vite's preview server turns ${host} away (403: the host is not among the ones it allows), so the app's address does not open it." ;
      return 1 ;
    fi
    sleep 2 ;
  done
  echo "The app's server does not answer." ;
  return 1 ;
}

# The package manager of an app from its lock file: npm (package-lock.json, or none), pnpm or yarn, the last two through
# Node.js's corepack. Bun is not in the app's container.
function material_ui_package_manager() {
  local app="$1" ;
  if [ -f "${app}/pnpm-lock.yaml" ] ; then echo 'pnpm' ;
  elif [ -f "${app}/yarn.lock" ] ; then echo 'yarn' ;
  elif [ -f "${app}/bun.lock" ] || [ -f "${app}/bun.lockb" ] ; then echo 'bun' ;
  else echo 'npm' ; fi
}

# The command line of a package manager in the container: pnpm and yarn through corepack, without its prompt.
function material_ui_pm() {
  case "$1" in
    npm) echo 'npm' ;;
    *) echo "COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack $1" ;;
  esac
}

# The script that pins the packages of Material UI's starter to the versions of the step pack's demo (its
# demo-src/package.json, the file it is given): the starter asks for the latest of each package, which would change
# from one build to the next. Run with node in the app's folder; a package the demo has no version of stops it.
function material_ui_pin_script() {
  echo 'const fs=require("fs"),pin=JSON.parse(fs.readFileSync(process.argv[1],"utf8")),all=Object.assign({},pin.dependencies,pin.devDependencies),p=JSON.parse(fs.readFileSync("package.json","utf8")),missing=[];for(const k of ["dependencies","devDependencies"])for(const n of Object.keys(p[k]||{})){if(all[n])p[k][n]=all[n];else missing.push(n)}if(missing.length){console.error("The demo has no version of "+missing.join(", "));process.exit(1)}fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")' ;
}

# The app in app/. A new one comes from the step pack's release MATERIAL_UI_DEMO_PACK_VERSION, taken from npm: the demo
# template is assembled by the pack's own script (demo-src/assemble.sh: Material UI's Vite starter, its free templates
# and its documentation demos, at MATERIAL_UI_VERSION, with the pack's glue and lock); the minimal template is
# Material UI's starter alone (examples/material-ui-vite-ts of the release, taken with git), its packages at the
# versions of the pack's demo. An app of your own is the folder of a repository (only that folder is checked out): a
# Material UI app built with Vite, whose packages are its own (not those of a workspace of its repository).
function material_ui_get_app() {
  local project_path="$1" template="$2" source="$3" ref="$4" app_path="$5" root app pack ;
  root="$(material_ui_root)" ;
  app="${root}/${MATERIAL_UI_APP}" ;
  pack='/tmp/material-ui-pack' ;
  if [ -z "${source}" ] ; then
    echo "Taking ${MATERIAL_UI_STEPS_PACKAGE} ${MATERIAL_UI_DEMO_PACK_VERSION} from npm: its demo's assemble script, and the versions of its packages." ;
    ddev exec -d "${root}" "rm -rf ${pack} && mkdir -p ${pack} && cd ${pack} && npm pack --silent ${MATERIAL_UI_STEPS_PACKAGE}@${MATERIAL_UI_DEMO_PACK_VERSION} > /dev/null && tar -xzf ./*.tgz && test -f package/demo-src/assemble.sh" < /dev/null \
      || { echo "${MATERIAL_UI_STEPS_PACKAGE} ${MATERIAL_UI_DEMO_PACK_VERSION} could not be taken from npm." ; return 1 ; } ;
    if [ "${template}" = 'demo' ] ; then
      echo "Making the demo: Material UI ${MATERIAL_UI_VERSION}'s Vite starter, its free templates and its documentation demos, assembled by the pack's own script." ;
      ddev exec -d "${root}" "MUI_VERSION=${MATERIAL_UI_VERSION} bash ${pack}/package/demo-src/assemble.sh ${app} && rm -rf ${pack}" < /dev/null \
        || { echo "The demo could not be assembled." ; return 1 ; } ;
      echo "Installing the app's packages with npm, from the demo's lock." ;
      ddev exec -d "${app}" "npm ci --no-audit --no-fund" < /dev/null \
        || { echo "npm ci failed." ; return 1 ; } ;
      return 0 ;
    fi
    echo "Making a new app: Material UI ${MATERIAL_UI_VERSION}'s own Vite starter (examples/material-ui-vite-ts), its packages at the versions of the pack's demo." ;
    ddev exec -d "${root}" "rm -rf /tmp/material-ui-src && git -c advice.detachedHead=false clone --quiet --depth 1 --branch v${MATERIAL_UI_VERSION} --filter=blob:none --sparse https://github.com/mui/material-ui.git /tmp/material-ui-src && git -c advice.detachedHead=false -C /tmp/material-ui-src sparse-checkout set examples/material-ui-vite-ts && mkdir -p ${app} && cp -a /tmp/material-ui-src/examples/material-ui-vite-ts/. ${app}/ && cp /tmp/material-ui-src/LICENSE ${app}/LICENSE.material-ui && rm -rf /tmp/material-ui-src" < /dev/null \
      || { echo "Material UI ${MATERIAL_UI_VERSION}'s starter could not be taken." ; return 1 ; } ;
    ddev exec -d "${app}" "node -e '$(material_ui_pin_script)' ${pack}/package/demo-src/package.json && rm -rf ${pack}" < /dev/null \
      || { echo "The starter's packages could not be pinned to the versions of the pack's demo." ; return 1 ; } ;
    echo "Installing the app's packages with npm." ;
    ddev exec -d "${app}" "npm install --no-audit --no-fund" < /dev/null \
      || { echo "npm install failed." ; return 1 ; } ;
    return 0 ;
  fi
  echo "Getting the app: ${source}${ref:+ at ${ref}}${app_path:+, its folder ${app_path}/}" ;
  if [ -n "${app_path}" ] ; then
    # A repository of several apps can be big: only the app's folder is checked out.
    ddev exec "rm -rf /tmp/material-ui-source && git -c advice.detachedHead=false clone --quiet --depth 1 ${ref:+--branch '${ref}'} --filter=blob:none --sparse '${source}' /tmp/material-ui-source && git -c advice.detachedHead=false -C /tmp/material-ui-source sparse-checkout set '${app_path}'" < /dev/null \
      || { echo "The app could not be cloned from ${source}${ref:+ at ${ref}}." ; return 1 ; } ;
  else
    ddev exec "rm -rf /tmp/material-ui-source && git -c advice.detachedHead=false clone --quiet --depth 1 ${ref:+--branch '${ref}'} '${source}' /tmp/material-ui-source" < /dev/null \
      || { echo "The app could not be cloned from ${source}${ref:+ at ${ref}}." ; return 1 ; } ;
  fi
  ddev exec "test -f '/tmp/material-ui-source/${app_path:+${app_path}/}package.json' && mkdir -p ${app} && cp -a '/tmp/material-ui-source/${app_path:+${app_path}/}.' ${app}/ && rm -rf ${app}/.git" < /dev/null \
    || { echo "${source}${app_path:+ (${app_path}/)} has no package.json: it is not the folder of an app." ; return 1 ; } ;
  ddev exec "rm -rf /tmp/material-ui-source" < /dev/null ;
  local own="${project_path}/${MATERIAL_UI_APP}" ;
  if ! grep -q '"@mui/material"' "${own}/package.json" ; then
    echo "${source}${app_path:+ (${app_path}/)} is not a Material UI app (its package.json does not list @mui/material): this builder makes and serves Material UI apps." ;
    return 1 ;
  fi
  if ! grep -q '"vite"' "${own}/package.json" ; then
    echo "${source}${app_path:+ (${app_path}/)} is not built with Vite (its package.json does not list vite): this builder serves the production build of a Vite app." ;
    return 1 ;
  fi
  if grep -q '"workspace:' "${own}/package.json" ; then
    echo "The app takes packages of a workspace of its repository (\"workspace:\" in its package.json), which are not copied with it: build it from a repository of its own." ;
    return 1 ;
  fi
  local pm ; pm="$(material_ui_package_manager "${own}")" ;
  if [ "${pm}" = 'bun' ] ; then
    echo "The app is installed with Bun (its lock file), which is not in the app's container: npm, pnpm and yarn are." ;
    return 1 ;
  fi
  local install ; install="$(material_ui_pm "${pm}") install" ;
  if [ "${pm}" = 'npm' ] && [ -n "${app_path}" ] && [ ! -f "${own}/package-lock.json" ] ; then
    # A folder of a repository of several apps, with no lock of its own: the repository resolved its packages as a
    # whole. npm would add the newest release each peer range allows beside the app's own (react-admin's demo: Material
    # UI's utils 9 beside its Material UI 7, and its build fails), so the peers are left to the app, as npm 6 did.
    install='npm install --legacy-peer-deps' ;
    echo "Installing the app's packages with npm, its peers left to it as npm 6 did (--legacy-peer-deps): a folder of a repository of several apps, with no lock of its own." ;
  else
    echo "Installing the app's packages with ${pm}." ;
  fi
  ddev exec -d "${app}" "${install}" < /dev/null \
    || { echo "${pm} install failed." ; return 1 ; } ;
  # Vite builds and serves the app from its node_modules: an install that leaves none (Yarn's Plug'n'Play) cannot.
  if [ ! -e "${own}/node_modules/.bin/vite" ] ; then
    echo "The app's packages are not in its node_modules folder (Yarn's Plug'n'Play?), where Vite builds and serves it from: set nodeLinker: node-modules in its .yarnrc.yml." ;
    return 1 ;
  fi
}

# Build an app from nothing: the project and its container, the app, its production build, and with --install the app
# served and checked.
function material_ui_build() {
  trim_project_name ;
  local base_url runtime ;
  runtime="$(material_ui_runtime)" ;
  if [ "${RUNTIME:-_none_}" != '_none_' ] && [ "${RUNTIME}" != "${runtime}" ] ; then
    echo "--runtime ${RUNTIME} needs a Webship Workspace with the container runtimes (webship/workspace#694): update the workspace, or build on DDEV." ;
    exit 1 ;
  fi
  case " ${MATERIAL_UI_RUNTIMES} " in
    *" ${runtime} "*) ;;
    *) echo "A Material UI app builds on DDEV, Docker Compose, Podman and Kubernetes for now (--runtime ddev, docker, podman or kubernetes), not on ${runtime}: that runtime is not proven for it yet. Nothing was changed." ; exit 1 ;;
  esac
  if [ "${runtime}" != 'ddev' ] && ! declare -f rt_serve > /dev/null ; then
    echo "Material UI on ${runtime} needs a Webship Workspace whose runtimes take an application's own language and server (webship/workspace#841, core 1.0.32 or later): update the workspace, or build on DDEV." ;
    exit 1 ;
  fi
  local source="${SOURCE:-${app_source:-}}" ;
  local ref="${REF:-${app_source_ref:-}}" ;
  local app_path="${APP_PATH:-${app_source_path:-}}" ;
  local template="${TEMPLATE:-_none_}" ;
  [ "${template}" = '_none_' ] && template='' ;
  local vite_build='' host='' ;
  [ "${VITE_BUILD:-}" = 'yes' ] && vite_build='yes' ;
  if [ -n "${vite_build}" ] && [ -z "${source}" ] ; then
    echo "--vite-build builds an app of your own (--source) with Vite alone: the demo and the starter are built with Vite already. Nothing was changed." ;
    exit 1 ;
  fi
  if [ -n "${template}" ] && [ -n "${source}" ] ; then
    echo "--template makes a new app, and --source takes an app of your own: give one of them. Nothing was changed." ;
    exit 1 ;
  fi
  [ -z "${source}" ] && template="${template:-demo}" ;
  case " ${MATERIAL_UI_TEMPLATES} " in
    *" ${template:-demo} "*) ;;
    *) echo "--template takes demo or minimal: Material UI's starter with the step pack's demo (its templates and documentation demos), or the starter alone. Nothing was changed." ; exit 1 ;;
  esac
  if [ -n "${app_path}" ] && [ -z "${source}" ] ; then
    echo "--path names a folder of the repository given with --source: give --source too. Nothing was changed." ;
    exit 1 ;
  fi
  if [[ "${app_path}" == /* ]] || [[ "/${app_path}/" == */../* ]] || [[ "${app_path}" == *"'"* ]] || [[ "${source}${ref}" == *"'"* ]] ; then
    echo "--source, --ref and --path take a repository, a branch or tag, and a folder inside the repository. Nothing was changed." ;
    exit 1 ;
  fi
  if [ ${#PROJECT_NAME} -gt 40 ] || ! [[ "${PROJECT_NAME}" =~ ^[a-z0-9][a-z0-9-]*$ ]] ; then
    echo "The project name ${PROJECT_NAME} must be small letters, digits and dashes (its address and its containers take it). Nothing was changed." ;
    exit 1 ;
  fi
  local project_path="${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME}" ;
  local root ; root="$(material_ui_root)" ;
  local made ;
  if [ -n "${source}" ] ; then made="${source}${ref:+ (${ref})}${app_path:+, ${app_path}/}" ;
  elif [ "${template}" = 'demo' ] ; then made="the demo of ${MATERIAL_UI_STEPS_PACKAGE} ${MATERIAL_UI_DEMO_PACK_VERSION}: Material UI ${MATERIAL_UI_VERSION}'s Vite starter with its free templates and documentation demos" ;
  else made="Material UI ${MATERIAL_UI_VERSION}'s Vite starter" ; fi

  cd ${WORKSPACE_ROOT}/${doc_name} || exit 1 ;

  # A project of the same name goes first, with its containers.
  drop_database ;
  rm -rf "${PROJECT_NAME:?}" ;
  mkdir -p "${PROJECT_NAME}" ;
  cd "${project_path}" || exit 1 ;

  # A generic web server, no database, and Node.js in the app's container: Vite's own server serves the build.
  if [ "${runtime}" == 'ddev' ] ; then
    ddev config --project-type=generic --webserver-type=generic --docroot="" --project-name=${PROJECT_NAME} \
      --omit-containers=db --nodejs-version=$(ddev_nodejs_version) < /dev/null || exit 1 ;
    host="$(material_ui_host_of "$(material_ui_url)")" ;
    material_ui_write_ddev_config "${project_path}" "${made}" "${host}" || exit 1 ;
  else
    # The runtime's own project: Docker Compose, Podman or Kubernetes, through the runtime layer.
    ddev config --project-type=generic --webserver-type=generic --docroot="" --project-name=${PROJECT_NAME} \
      --omit-containers=db --auto < /dev/null || exit 1 ;
    material_ui_runtime_config || { echo "The app's stack could not be written through the runtime layer." ; exit 1 ; } ;
  fi
  # The address is the runtime's to say, once the project is configured: never a written ddev.site.
  base_url="$(material_ui_url)" ;

  echo "Starting the project: Node.js ${MATERIAL_UI_NODE_VERSION} in the app's container." ;
  ddev_up start -y < /dev/null || exit 1 ;

  material_ui_get_app "${project_path}" "${template}" "${source}" "${ref}" "${app_path}" || exit 1 ;

  # The production build. The demo and the starter alone are built by Vite (the starter's own script runs a type check
  # first: tsc -b && vite build). An app of your own is built with its own build script, which may do more than Vite
  # (code generation, its environment); with --vite-build, by Vite alone, for an app whose script needs more of its
  # repository than its folder (react-admin's demo: its type check wants its monorepo's types).
  local pm ; pm="$(material_ui_package_manager "${project_path}/${MATERIAL_UI_APP}")" ;
  local build='npx --no-install vite build' ;
  if [ -z "${source}" ] ; then
    echo "Building the app with Vite: vite build." ;
  elif [ "${vite_build}" = 'yes' ] ; then
    echo "Building the app with Vite alone (--vite-build): vite build, not its build script." ;
  else
    build="$(material_ui_pm "${pm}") run build" ;
    echo "Building the app with its own build script: ${pm} run build." ;
  fi
  if ! ddev exec -d "${root}/${MATERIAL_UI_APP}" "${build}" < /dev/null ; then
    echo "The app's build failed." ;
    [ -n "${source}" ] && [ "${vite_build}" != 'yes' ] \
      && echo "If its build script needs more of its repository than the app's folder (a type check against the types of a repository of several apps), build it with Vite alone: --vite-build." ;
    exit 1 ;
  fi
  if [ ! -f "${project_path}/${MATERIAL_UI_APP}/dist/index.html" ] ; then
    echo "The build left no ${MATERIAL_UI_APP}/dist/index.html: the app is not built by Vite into its dist/ folder (another tool, or another outDir?)." ;
    exit 1 ;
  fi

  [ "${ADD_USERS}" == 'yes' ] && echo "--add-users: the app has no accounts of the workspace's; nothing is added." ;

  if [ "${INSTALL}" == 'yes' ] ; then
    material_ui_wait "${host}" || exit 1 ;
    echo "${doc_name} ${PROJECT_NAME} is served: the Material UI app in ${MATERIAL_UI_APP}/ (${made}).";
    echo "Go to ${base_url}";
  else
    ddev stop < /dev/null ;
    echo "${doc_name} ${PROJECT_NAME} is ready: the Material UI app in ${MATERIAL_UI_APP}/ (${made}).";
    if [ "${runtime}" = 'ddev' ] ; then
      echo "Serve it with: cd ${PROJECT_NAME} && ddev start   (or build with --install)";
    else
      echo "Serve it with Start in its row of the dashboard (or build with --install)";
    fi
  fi

  if [ "${LAUNCH}" == 'yes' ] ; then
    ddev launch ;
  fi

  cd ${WORKSPACE_ROOT}/${doc_name};
}

# The app has no accounts of the workspace's: there is nothing to add, and nothing to remove.
function add_material_ui_users() {
  echo "The Material UI app has no accounts of the workspace's, so there are none to add." ;
}

function cancel_material_ui_users() {
  echo "The Material UI app has no accounts of the workspace's, so there are none to remove." ;
}

# The step pack in the testing stack of an app of this builder. The core's testing_configure calls this in the project
# folder once webship-js is scaffolded and before the dependencies are installed; for a project that is not an app of
# this builder it changes nothing.
#
# It adds the pack to package.json, lists its step definitions in cucumber.js after webship-js's own, and, for the demo
# template, writes a first feature when the project has none of its own. There is no users registry: the app has no
# accounts. Every part is skipped when it is already done, so a second run adds what the first missed and never resets
# a suite. The suite is the project's (its package.json, cucumber.js and tests/ are next to app/, not in it).
function testing_configure_material_ui() {
  local project_path="$1";
  material_ui_is_project "${project_path}" || return 0 ;
  if [ ! -f "${project_path}/cucumber.js" ] || [ ! -f "${project_path}/package.json" ] ; then
    echo "  Material UI: cucumber.js is not here yet — run the testing setup again once webship-js is scaffolded." ;
    return 1 ;
  fi

  echo "Adding the Material UI step pack (${MATERIAL_UI_STEPS_PACKAGE} ${MATERIAL_UI_STEPS_VERSION}).";

  python3 - "${project_path}" "${MATERIAL_UI_STEPS_PACKAGE}" "${MATERIAL_UI_STEPS_VERSION}" <<'PYEOF' || return 1
import json, re, sys

project, pack, version = sys.argv[1:4]

# package.json: the pack as a dev dependency, at the release line this plugin was proven on.
pkg_file = project + '/package.json'
pkg = json.load(open(pkg_file))
if pack not in pkg.get('dependencies', {}) and pack not in pkg.get('devDependencies', {}):
    pkg.setdefault('devDependencies', {})[pack] = version
    open(pkg_file, 'w').write(json.dumps(pkg, indent=2) + '\n')
    print('  package.json: %s %s' % (pack, version))

# cucumber.js: the pack's step definitions after webship-js's own.
cucumber_file = project + '/cucumber.js'
src = open(cucumber_file).read()
before = src

if ('node_modules/%s/' % pack) not in src:
    line = "'node_modules/%s/tests/step-definitions/*.js'," % pack
    core = re.search(r"^([ \t]*)'node_modules/webship-js/tests/step-definitions/[^']*',.*$", src, re.M)
    opening = re.search(r"^([ \t]*)require:[ \t]*\[[ \t]*$", src, re.M)
    if core:
        src = src[:core.end()] + '\n' + core.group(1) + line + src[core.end():]
    elif opening:
        src = src[:opening.end()] + '\n' + opening.group(1) + '  ' + line + src[opening.end():]
    else:
        sys.exit("  cucumber.js has no require list this can add to. Add this line to it:\n    " + line)
    print('  cucumber.js: the step definitions of %s' % pack)

if src != before:
    open(cucumber_file, 'w').write(src)
PYEOF

  # A first feature, for the demo template only (an app of your own has its own names), when the project has none
  # for the app yet.
  local feature="${WORKSPACE_SCRIPTS}/plugins/material-ui/site.feature" ;
  if [ -f "${feature}" ] && [ ! -f "${project_path}/tests/features/site.feature" ] ; then
    if [ -f "${project_path}/${MATERIAL_UI_APP}/src/ComponentsPage.tsx" ] && [ -d "${project_path}/${MATERIAL_UI_APP}/src/templates/sign-in" ] ; then
      mkdir -p "${project_path}/tests/features" && cp "${feature}" "${project_path}/tests/features/site.feature" \
        && echo "  tests/features/site.feature: a first feature for the demo" ;
    else
      echo "  Material UI: the app is not the demo template, so no first feature is written: write one from what its pages show." ;
    fi
  fi
}
