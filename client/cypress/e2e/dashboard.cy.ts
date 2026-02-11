describe('Dashboard', () => {
  beforeEach(() => {
    cy.apiLogin();
    cy.visit('/dashboard');
  });

  it('loads the dashboard page', () => {
    cy.url().should('include', '/dashboard');
  });

  it('displays skill cards with icons and belt badges', () => {
    cy.get('.SkillCard').should('have.length.greaterThan', 0);
    cy.get('.SkillCard .SkillIcon').should('exist');
    cy.get('.SkillCard .BeltBadge').should('exist');
  });

  it('navigates to skill detail on card click', () => {
    cy.get('.SkillCard').first().click();
    cy.url().should('match', /\/skills\/.+/);
  });
});
