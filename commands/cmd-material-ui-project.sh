#!/usr/bin/env bash

# workspace-name: Material UI (React app)

# Installed by the Material UI plugin (plugins.sh --install material-ui); __WORKSPACE__ is the workspace it was
# installed into.
#
# Make an app with Material UI's own Vite starter (with the Material UI step pack's demo by default: the starter, its
# free templates and its documentation demos; or the starter alone), or take one from its repository with --source,
# build it, and serve its production build from a container of its own with Vite's own preview server: Node.js, the
# app's language, runs in the app's container, never on the machine. With --install the app is served and checked. It
# has no database, and no accounts of the workspace's. The workspace is container-based (DDEV by default, at
# https://<name>.ddev.site); --runtime docker, podman or kubernetes builds it on Docker Compose, Podman or a Kubernetes
# cluster instead, at the address that runtime gives.

# Bootstrap.
# Find the workspace tooling from this script, so a fresh clone needs no setup.
WORKSPACE_SCRIPTS="${WORKSPACE_SCRIPTS:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../core/scripts" && pwd)}";
source ${WORKSPACE_SCRIPTS}/bootstrap.sh || exit 1 ;

# Load workspace settings.
eval $(parse_yaml ${WORKSPACE_CONFIG}/workspace.__WORKSPACE__.settings.yml);

# Where the app comes from: nothing means a new app of Material UI's starter.
app_source="";
app_source_ref="";
app_source_path="";

# Distribution.
distribution_name="material-ui";
distribution_title="Material UI";
distribution_webroot="app/dist";

ARGPARSE_DESCRIPTION="Build a ${distribution_title} project in __WORKSPACE__"
# The args file comes with the plugin: core/scripts/plugins/material-ui/ is where plugins.sh --install puts it.
source ${WORKSPACE_SCRIPTS}/plugins/material-ui/args/arg-material-ui.sh || exit 1 ;

shift $#;

material_ui_build ;
