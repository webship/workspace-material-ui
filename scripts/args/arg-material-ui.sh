#!/usr/bin/env bash

argparse "$@" <<ARGEOF || exit 1
parser.add_argument('PROJECT_NAME',
                    help='The name of the project: its folder, and its project on the container runtime.')
parser.add_argument('--runtime',
                    dest='RUNTIME',
                    default="_none_",
                    choices=['ddev', 'docker', 'podman', 'kubernetes'],
                    help='The container runtime to build on: ddev (the default, or container.runtime of settings.yml), docker (Docker Compose), podman or kubernetes.')
parser.add_argument('-t', '--template',
                    dest='TEMPLATE',
                    default="_none_",
                    choices=['demo', 'minimal'],
                    help="The template a new app is made from: demo (the default: Material UI's own Vite starter with the demo of the Material UI step pack: its free templates (sign-in, checkout, dashboard, CRUD dashboard, marketing page, blog) and a page of its documentation's demos) or minimal (the starter alone).")
parser.add_argument('-s', '--source',
                    default="${app_source}",
                    help="A git repository of a Material UI app built with Vite to build instead of a new one; empty means a new app of Material UI's starter. Example: --source https://github.com/marmelab/react-admin --ref v5.15.7 --path examples/demo --vite-build [default %(default)s]")
parser.add_argument('-r', '--ref',
                    default="${app_source_ref}",
                    help='A branch or a tag of that repository; empty means its default branch. Example: --ref v5.15.7 [default %(default)s]')
parser.add_argument('-p', '--path',
                    dest='APP_PATH',
                    default="${app_source_path}",
                    help='The folder of the app in that repository, for a repository of several apps; empty means its root. Example: --path examples/demo [default %(default)s]')
parser.add_argument('--vite-build',
                    dest='VITE_BUILD',
                    action='store_true',
                    default=False,
                    help="Build an app of your own (--source) with Vite alone (vite build) instead of its own build script (npm run build), for an app whose script needs more of its repository than the app's folder, such as a type check against the types of a repository of several apps. The demo and the starter are built with Vite already.")
parser.add_argument('-i', '--install',
                    action='store_true',
                    default=False,
                    help='Serve the built app and check that it answers at its address (https://<name>.ddev.site on DDEV, a port of this machine on Docker Compose and Podman, a port of the node on Kubernetes).')
parser.add_argument('-a', '--add-users',
                    action='store_true',
                    default=False,
                    help='Taken so that every builder accepts the same flags: the app has no accounts of the workspace, and nothing is added.')
parser.add_argument('-l', '--launch',
                    action='store_true',
                    default=False,
                    help='Open the app in a browser when it is ready.')
ARGEOF
