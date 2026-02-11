describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('logs in with valid credentials and redirects to dashboard', () => {
    cy.fixture('user').then((user) => {
      cy.get('input[name="email"]').type(user.email);
      cy.get('input[name="password"]').type(user.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
    });
  });

  it('shows error with wrong password', () => {
    cy.fixture('user').then((user) => {
      cy.get('input[name="email"]').type(user.email);
      cy.get('input[name="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/login');
      cy.contains(/invalid|incorrect|wrong/i).should('be.visible');
    });
  });

  it('logs out and redirects to login', () => {
    cy.apiLogin();
    cy.visit('/dashboard');
    cy.contains('Logout', { matchCase: false }).click();
    cy.url().should('include', '/login');
  });
});
