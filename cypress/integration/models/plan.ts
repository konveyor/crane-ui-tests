import { PlanData } from '../types/types';
import { clickByText, click, inputText, next, selectFromDroplist } from '../../utils/utils';
import { navMenuPoint } from '../views/menu.view';
import { planNameInput, searchInput, searchButton, directPvMigrationCheckbox, verifyCopyCheckbox,
  dataLabel, kebab, kebabDropDownItem } from '../views/plan.view';

export class Plan {
  protected static openList(): void {
    clickByText(navMenuPoint, 'Migration plans');
  }
  
  protected generalStep(planData: PlanData): void {
    const { name, source, target, repo } = planData;
    inputText(planNameInput, name);
    selectFromDroplist('Select source', source);
    selectFromDroplist('Select target', target);
    selectFromDroplist('Select repository', repo);
    next();
  }

  protected selectNamespace(planData: PlanData): void {
    const { namespaceList } = planData;
    namespaceList.forEach((name) => {
      inputText(searchInput, name);
      click(searchButton);
      cy.get('td')
        .contains(name)
        .parent('tr')
        .within(() => {
          click('input');
        });
    });
    next();
  }

  protected persistentVolumes(): void {
    //Wait for PVs to be listed and the 'Next' button to be enabled
    cy.contains('button', 'Next', { timeout: 200000 }).should('be.enabled');
    next();
  }

  protected copyOptions(planData: PlanData): void {
    const { verifyCopy } = planData;
    if (verifyCopy) {
      cy.get(verifyCopyCheckbox, { timeout: 20000 }).should('be.enabled').check();
      //Close copy performance warning
      clickByText('button', 'Close');
    }
    next();
  }

  protected migrationOptions(): void {
    cy.get(directPvMigrationCheckbox, { timeout: 20000 }).should('be.enabled').uncheck();
    next();
  }

  protected hooks(): void {
    clickByText('button', 'Finish');
  }

  protected run(name: string): void {
    cy.get('th')
      .contains(name)
      .parent('tr')
      .within(() => {
        click(kebab);
    });
    clickByText(kebabDropDownItem, 'Migrate');
    //Confirm dialog before migration
    clickByText('button', 'Migrate');
  }

  protected waitForNotReady(name: string): void {
    cy.get('th')
      .contains(name)
      .closest('tr')
      .within(() => {
        cy.get(dataLabel.status).contains('Not Ready', { timeout: 2000 });
      });
  }

  protected waitForReady(name: string): void {
    cy.get('th')
      .contains(name)
      .closest('tr')
      .within(() => {
        cy.get(dataLabel.status).contains('Ready', { timeout: 10000 });
      });
  }

  protected waitForSuccess(name: string): void {
    cy.get('th')
      .contains(name, { timeout: 10000 })
      .closest('tr')
      .within(() => {
        cy.get(dataLabel.status).contains('Migration succeeded', { timeout: 600000 });
      });
  }
  
  create(planData: PlanData): void {
    const { name } = planData;

    //Navigate to 'Migration plans tab and create a new plan
    Plan.openList();
    clickByText('button', 'Add migration plan');
    this.generalStep(planData);
    this.selectNamespace(planData);
    this.persistentVolumes();
    this.copyOptions(planData);
    this.migrationOptions();
    this.hooks();

    //Assert that plan is successfully validated before being run
    cy.get('span#condition-message').should('contain', 'The migration plan is ready', { timeout : 10000 });
    clickByText('button', 'Close');

    //Wait for plan to be in 'Ready' state
    this.waitForReady(name);
  }

  execute(planData: PlanData): void {
    const { name } = planData;
    Plan.openList();
    this.run(name);
    this.waitForSuccess(name);
  }

  delete(planData: PlanData): void {
    const { name } = planData;
    Plan.openList();
    cy.get('th')
      .contains(name)
      .parent('tr')
      .within(() => {
        click(kebab);
    });
    clickByText(kebabDropDownItem, 'Delete');

    //Confirm dialog before deletion
    clickByText('button', 'Confirm');
    this.waitForNotReady(name);

    //Wait for plan to be delted
    //TO DO: Assert flash message upon deletion
    cy.get('h3').should('contain', 'No migration plans exist', { timeout : 10000})
  }
}