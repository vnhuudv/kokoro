import { NominicationService } from '../../../../src/services/api-gateway/src/modules/nominication/nominication.service';

const mockPool = {
  query: jest.fn(),
};

describe('NominicationService', () => {
  let service: NominicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NominicationService(mockPool as any);
  });

  describe('createSession', () => {
    it('inserts session and returns it', async () => {
      const session = {
        id: 'sess-1',
        tenantId: 'tenant-1',
        channelId: 'C001',
        initiatorSlackUserId: 'U001',
        beerAppGroupId: null,
        triggerType: 'manual',
        nudgeId: null,
        scheduledAt: null,
        status: 'pending',
        venue: null,
        createdAt: new Date(),
      };
      mockPool.query.mockResolvedValueOnce({ rows: [session] });

      const result = await service.createSession('tenant-1', 'U001', { channelId: 'C001' });

      expect(result).toEqual(session);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nominication_sessions'),
        expect.arrayContaining(['tenant-1', 'C001', 'U001']),
      );
    });
  });

  describe('getSession', () => {
    it('returns session for matching tenant', async () => {
      const session = { id: 'sess-1', tenantId: 'tenant-1', status: 'pending' };
      mockPool.query.mockResolvedValueOnce({ rows: [session] });

      const result = await service.getSession('sess-1', 'tenant-1');
      expect(result).toEqual(session);
    });

    it('throws NotFoundException when session not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(service.getSession('bad-id', 'tenant-1')).rejects.toThrow('Session not found');
    });
  });

  describe('markAttendance', () => {
    it('inserts attendee record', async () => {
      // verify session exists
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'sess-1' }] });
      // insert attendee (ON CONFLICT DO NOTHING)
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // tryCompleteSession update
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.markAttendance('sess-1', 'tenant-1', 'U002');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nominication_attendees'),
        expect.arrayContaining(['sess-1', 'U002']),
      );
    });

    it('throws NotFoundException when session not in tenant', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(service.markAttendance('bad-id', 'tenant-1', 'U002')).rejects.toThrow('Session not found');
    });
  });

  describe('getPendingNudges', () => {
    it('returns nudges with status pending', async () => {
      const nudges = [{ id: 'n-1', status: 'pending', targetSlackUserId: 'U001', channelId: 'C001' }];
      mockPool.query.mockResolvedValueOnce({ rows: nudges });

      const result = await service.getPendingNudges('tenant-1');

      expect(result).toEqual(nudges);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status IN ('pending')"),
        ['tenant-1'],
      );
    });
  });

  describe('updateNudgeStatus', () => {
    it('updates nudge status and responded_at', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.updateNudgeStatus('n-1', 'tenant-1', 'sent');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE nominication_nudges'),
        expect.arrayContaining(['sent', 'n-1', 'tenant-1']),
      );
    });
  });
});
