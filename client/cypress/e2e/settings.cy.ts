describe('Settings', () => {
  beforeEach(() => {
    cy.apiLogin();
    cy.visit('/settings');
  });

  it('loads the settings page', () => {
    cy.url().should('include', '/settings');
    cy.contains(/settings|preferences|profile/i).should('be.visible');
  });

  it('displays user profile fields', () => {
    cy.get('input[name="name"]').should('exist');
    cy.get('textarea[name="bio"]').should('exist');
  });

  it('can update profile name', () => {
    const testName = `Test User ${Date.now()}`;
    cy.get('input[name="name"]').clear().type(testName);
    cy.get('button[type="submit"]').click();
    cy.contains(/saved|updated|success/i, { timeout: 5000 }).should('be.visible');
  });
});
