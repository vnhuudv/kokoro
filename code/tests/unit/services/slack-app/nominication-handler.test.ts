import { handleNomicationCommand } from '../../../../src/services/slack-app/src/handlers/nominication';

const mockClient = { chat: { postEphemeral: jest.fn() } };

beforeEach(() => jest.clearAllMocks());

global.fetch = jest.fn() as jest.Mock;

describe('handleNomicationCommand', () => {
  it('creates session and posts ephemeral on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'sess-1', channelId: 'C001', status: 'pending' }),
    });

    await handleNomicationCommand('C001', '', 'U001', mockClient as any);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/nominication/sessions'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockClient.chat.postEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'C001', user: 'U001' }),
    );
  });

  it('posts error ephemeral when API call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    await handleNomicationCommand('C001', '', 'U001', mockClient as any);

    expect(mockClient.chat.postEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Failed') }),
    );
  });
});
