import { cloneDeep } from 'cypress/types/lodash';
import * as loginView from '../integration/views/login.view';
import { editTargetNamepace, searchButton, searchInput } from '../integration/views/plan.view';

const userName = Cypress.env('user');
const userPassword = Cypress.env('password');
const craneUiUrl = Cypress.env('craneUrl');

export function inputText(fieldId: string, text: string): void {
  cy.get(fieldId).clear().type(text);
}

export function clickByText(fieldId: string, buttonText: string): void {
  cy.contains(fieldId, buttonText).click();
}

export function click(fieldId: string): void {
  cy.get(fieldId).click();
}

export function login(): void {
  cy.visit(craneUiUrl);
  cy.get('body').then((body) => {
    if (body.find("h1:contains('Migration Toolkit for Containers')").length != 1) {
      cy.findByText('kube:admin').click();
      inputText(loginView.userNameInput, userName);
      inputText(loginView.userPasswordInput, userPassword);
      clickByText('button', 'Log in');
    }
  })
}

export function next(): void {
  clickByText('button', 'Next');
}

export function selectFromDroplist(selector: string, selectionMade: string): void {
  clickByText('button', selector);
  clickByText('button', selectionMade);
}

export function getTd(columnValue: string, locator: string, tdValue: string): void {
  cy.get('td')
    .contains(columnValue)
    .closest('tr')
    .within(() => {
      cy.get(locator).contains(tdValue, { timeout: 2000 });
    });
}

export function log(fileName: string, result: any) {
  const { code, stdout, stderr } = result
  if (code != 0) {
    cy.writeFile('./cypress/reports/' + fileName.replace(' ', '_') + '_err.txt', stderr)
  }
  cy.writeFile('./cypress/reports/' + fileName.replace(' ', '_') + '_output.txt', stdout)
}

export function searchAndSelectNamespace(name) {

  inputText(searchInput, name);
  cy.get(searchButton).first().click();
  cy.get('td')
    .contains(name)
    .parent('tr')
    .within(() => {
      click('input');
    });
}

export function editTargetNamespace(name) {
  cy.get('td')
    .contains(name)
    .parent('tr')
    .within(() => {
      click(editTargetNamepace);
    });
  inputText(targetNamespace, 'non-default');
  click(saveEdit);
}