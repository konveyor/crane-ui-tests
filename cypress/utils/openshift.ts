// function login(
//     urlEndpoint: string,
//     username: string,
//     password: string,
//     failOnNonZeroExit: boolean = false
// ) {
//     return function (
//         target: any,
//         propertyKey: string,
//         descriptor: PropertyDescriptor
//     ) {
//         cy.log("login")
//         cy.exec(
//             `oc login ${urlEndpoint} -u ${username} -p ${password} --insecure-skip-tls-verify`,
//             {
//                 failOnNonZeroExit: failOnNonZeroExit,
//             }
//         );
//     };
// }

// todo: implement decorator to login automatically instead of calling the login in every method

export class Openshift {
    urlEndpoint;
    username;
    password;


    constructor(urlEndpoint, username, password) {
        this.urlEndpoint = urlEndpoint;
        this.username = username;
        this.password = password;
    }

    private login(
        urlEndpoint: string,
        username: string,
        password: string,
        failOnNonZeroExit: boolean = false
    ) {
        // todo: fix extra double quotation issue :/
        cy.log(`Logging in to ${urlEndpoint.indexOf('tgt') >= 0 ? 'target' : 'source'} cluster`)
        cy.exec(
            `oc login ${urlEndpoint} -u ${username} -p ${password} --insecure-skip-tls-verify`.replace(/\s+/g, ' ').trim().replace("\"", "").replace("\"", ""),
            {
                failOnNonZeroExit: true,
            }
        );
    }

    cleanProjects(namespaceList: [string]) {
        this.login(this.urlEndpoint, this.username, this.password);
        namespaceList.forEach((namespace) => {
            this.deleteProject(namespace);
        });
    }

    private deleteProject(namespace: string) {
        cy.exec('oc get ns').then(result => {
            if (result.stdout.indexOf(namespace) >= 0) {
                cy.exec(`oc delete project ${namespace}`, {timeout: 10000})
                    .then((result) => {
                        expect(result.stdout).to.contain(`\"${namespace}\" deleted`);
                    })
                    .wait(15000);
            }
        });
    }

    private createProjects(namespaceList: [string], deployApp: boolean = true) {
        namespaceList.forEach((namespace) => {
            this.createProject(namespace);
            this.deployApp("django-psql-persistent");
        });
    }

    private createProject(namespace: string) {
        cy
            .exec(`oc new-project ${namespace}`, {failOnNonZeroExit: false})
            .wait(60000);
    }

    private deployApp(app: string) {
        cy
            .exec(`oc new-app ${app}`, {timeout: 10000})
            .wait(10000);
    }

    assertAppMigrated(namespaceList: [string]) {

        this.login(this.urlEndpoint, this.username, this.password)

        namespaceList.forEach(namespace => {
            cy
                .wait(10000)
                .exec(`curl "$(oc get routes -n ${namespace} | grep django | awk '{print $2}')"`)
                .then(result => {
                    expect(result.stdout).to.contain('Welcome to your Django application on OpenShift');
                });
        });
    }

    setupCluster(namespaceList: [string]) {
        this.login(this.urlEndpoint, this.username, this.password);
        this.cleanProjects(namespaceList);
        this.createProjects(namespaceList);
    }

    deleteAllMigrationPlans() {
        this.login(this.urlEndpoint, this.username, this.password);
        cy.exec("oc delete migplan --all -n openshift-migration");
        cy.wait(10000)
    }
}
