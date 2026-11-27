Feature: A Material UI app on Docker Compose, Podman and Kubernetes
  The builder builds on DDEV by default, and with --runtime on Docker Compose, Podman or a Kubernetes cluster. An app
  built there has the row a DDEV project has: its state, its own address and the runtime's menu, and its own server
  serves its production build.

  # Each scenario drives a real app of that runtime, built with cmd-material-ui-project.sh --runtime: the first running
  # one the workspace holds. Without one it is skipped, with the reason. In the plugin's CI the Docker Compose app is
  # the one the manifest's featuresSite builds: the demo template, ci-material-ui.

  @needs-runtime-docker @needs-platform-material-ui
  Scenario: A Material UI app built on Docker Compose runs at its own address, with the DOCKER menu
    Given I am on the folder of the "docker" site
     Then the row of the "docker" site should show "Running"
      And the row of the "docker" site should link to the address of its runtime
      And the address of the "docker" site should answer
      And the row of the "docker" site should carry the "DOCKER" menu and no DDEV menu

  # The server's HTML is an empty root: React renders the page into it in the browser once the build's scripts have
  # run, so an element in the root is there from then on and never in the server's HTML, whichever app the builder made
  # (the demo, the starter alone, or an app of your own such as react-admin's demo).
  @needs-runtime-docker @needs-platform-material-ui
  Scenario: The app on Docker Compose is the built Material UI app, and React renders its page
    Given I am on the folder of the "docker" site
     When I open "/" on the "docker" site
     Then "#root > *" should be attached within 30 seconds

  @needs-runtime-podman @needs-platform-material-ui
  Scenario: A Material UI app built on Podman runs at its own address, with the PODMAN menu
    Given I am on the folder of the "podman" site
     Then the row of the "podman" site should show "Running"
      And the row of the "podman" site should link to the address of its runtime
      And the address of the "podman" site should answer
      And the row of the "podman" site should carry the "PODMAN" menu and no DDEV menu

  @needs-runtime-podman @needs-platform-material-ui
  Scenario: The app on Podman is the built Material UI app, and React renders its page
    Given I am on the folder of the "podman" site
     When I open "/" on the "podman" site
     Then "#root > *" should be attached within 30 seconds

  @needs-runtime-kubernetes @needs-platform-material-ui
  Scenario: A Material UI app built on Kubernetes runs at the address of its node, with the K8S menu
    Given I am on the folder of the "kubernetes" site
     Then the row of the "kubernetes" site should show "Running"
      And the row of the "kubernetes" site should link to the address of its runtime
      And the address of the "kubernetes" site should answer
      And the row of the "kubernetes" site should carry the "K8S" menu and no DDEV menu

  @needs-runtime-kubernetes @needs-platform-material-ui
  Scenario: The app on Kubernetes is the built Material UI app, and React renders its page
    Given I am on the folder of the "kubernetes" site
     When I open "/" on the "kubernetes" site
     Then "#root > *" should be attached within 30 seconds
