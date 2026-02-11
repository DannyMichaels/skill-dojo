describe('Public Profile', () => {
  beforeEach(() => {
    cy.apiLogin();
  });

  it('shows the user profile page', () => {
    // Get the logged-in user's username from the API
    cy.request({
      url: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('__dojo-auth-token')}`,
      },
    }).then((res) => {
      const username = res.body.user.username;
      cy.visit(`/u/${username}`);
      cy.contains(`@${username}`).should('be.visible');
    });
  });

  it('displays skill icons in skill list', () => {
    cy.request({
      url: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('__dojo-auth-token')}`,
      },
    }).then((res) => {
      const username = res.body.user.username;
      cy.visit(`/u/${username}`);
      cy.get('.PublicProfileScreen__skillCard').then(($cards) => {
        if ($cards.length > 0) {
          cy.get('.PublicProfileScreen__skillCard .SkillIcon').should('exist');
        }
      });
    });
  });

  it('expands skill to show concept mastery on click', () => {
    cy.request({
      url: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('__dojo-auth-token')}`,
      },
    }).then((res) => {
      const username = res.body.user.username;
      cy.visit(`/u/${username}`);
      cy.get('.PublicProfileScreen__skillCard').first().click();
      cy.get('.PublicProfileScreen__skillDetails').should('be.visible');
    });
  });

  it('shows day streak', () => {
    cy.request({
      url: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('__dojo-auth-token')}`,
      },
    }).then((res) => {
      const username = res.body.user.username;
      cy.visit(`/u/${username}`);
      cy.contains('day streak').should('be.visible');
    });
  });
});
