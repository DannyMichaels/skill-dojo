declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login via API and store the JWT token in localStorage.
       */
      apiLogin(email?: string, password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('apiLogin', (email?: string, password?: string) => {
  cy.fixture('user').then((user) => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: email ?? user.email,
        password: password ?? user.password,
      },
    }).then((res) => {
      expect(res.status).to.eq(200);
      window.localStorage.setItem('__dojo-auth-token', res.body.token);
    });
  });
});

export {};
