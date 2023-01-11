import { login } from "../../utils/utils";
import { run_command_oc } from "../../utils/oc_wrapper";

const craneUiUrl = Cypress.env("craneUrl");

describe("mtc-81-ui-component-no-proxy-login", () => {
  it("Make sure login works fine", () => {
    login();
  });

  it("Make sure the No-proxy variable does not contain the oauth subdomain in the target", () => {
    run_command_oc("target", "get proxy -oyaml")
      .its("stdout")
      .should("not.contain", "oauth-openshift.apps.cam");
  });

  it("Update the no proxy value in the proxy resource with the aouth value", () => {
    cy.exec("oc get proxy -o yaml | grep 'httpProxy:' | head -1").then(
      (result) => {
        const nodeEndpoint = result.stdout.split("@")[1].split(":")[0];

        cy.exec(
          `ssh -i ./cypress/assets/openshift-qe.pem ec2-user@${nodeEndpoint} cat /srv/squid/log/access.log ` +
            "| grep oauth-openshift.apps " +
            "| head -1 " +
            "| tr -s ' '",
          {
            timeout: 20000,
          }
        ).then((result) => {
          cy.wait(20000);
          const oauthString = result.stdout.split(" ")[6].split(":")[0];

          cy.exec(
            `oc get proxy cluster -o template --template {{.spec.noProxy}}`
          ).then((result) => {
            const existingNoProxyValue = result.stdout;
            cy.exec(
              `oc patch proxy cluster --type="json" -p='[{"op":"add","path":"/spec/noProxy","value":"${existingNoProxyValue},${oauthString}"}]'`
            );
          });
        });

        // todo: a way to run commands on ssh remote that requires a sudo preivilage
        cy.exec(
          `ssh -i ~/.ssh/openshift-qe.pem ec2-user@${nodeEndpoint} 'sudo echo "" > /srv/squid/log/access.log'`
        );
      }
    );
  });

  it(
    "Wait 5 minutes for pods to restart, then make sure they restarted",
    waitForPodsToRestart
  );

  it("Logging in should fail", () => {
    // todo: this needs to be fixed with correct locator
    cy.visit(craneUiUrl);
    cy.findByText("This site can’t be reached", { timeout: 600000 });
  });

  after("Revert the proxy changes", () => {
    cy.exec(
      `oc get proxy cluster -o template --template {{.spec.noProxy}}`
    ).then((result) => {
      const existingNoProxyValue = result.stdout;
      cy.exec(
        `oc patch proxy cluster --type="json" -p='[{"op":"add","path":"/spec/noProxy","value":"${existingNoProxyValue}"}]'`
      );
    });
    waitForPodsToRestart();
  });
});

function waitForPodsToRestart() {
  // wait 8 minutes
  cy.wait(500000);
  cy.exec(
    "oc -n openshift-migration get pods | sed -n '/NAME/!p' | sed -n '/Running/!p'"
  ).then((result) => {
    // if there are pods that are not running yet, wait another 5 minutes
    if (result.stdout != "") {
      cy.wait(300000);
    }
  });
}
