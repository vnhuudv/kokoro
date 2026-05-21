describe('slack-app health', () => {
  it('exports a createApp function', async () => {
    const { createApp } = await import('../../../../src/services/slack-app/src/index');
    expect(typeof createApp).toBe('function');
  });
});
