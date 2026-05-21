describe('AuthService.slackOAuthUrl', () => {
  beforeEach(() => {
    process.env.SLACK_CLIENT_ID = 'test-client-id';
    process.env.SLACK_OAUTH_REDIRECT_URI = 'http://localhost:3000/api/auth/slack/callback';
  });

  it('returns a Slack authorize URL with correct params', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AuthService } = require('../../src/services/api-gateway/src/modules/auth/auth.service');
    const service = new AuthService(null as any, null as any);
    const url = service.slackOAuthUrl();
    expect(url).toContain('https://slack.com/oauth/v2/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('user_scope=identity.basic');
    expect(url).toContain('redirect_uri=');
  });
});
