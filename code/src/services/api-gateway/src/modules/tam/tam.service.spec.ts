import { Test } from '@nestjs/testing';
import { TamService } from './tam.service';
import { DB_POOL } from '../database/database.module';

// Helper: mock responses for a full evaluateBadges call sequence
// badges, totalPoints, categoryPoints, alreadyAwarded, [optional insert]
function mockEvaluateBadges(
  mockPool: { query: jest.Mock },
  badges: { id: string; thresholdPoints: number; categoryFilter: string | null }[],
  total: number,
  categoryRows: { category: string; total: string }[],
  awarded: { badgeId: string }[],
  insertCount = 0,
) {
  mockPool.query
    .mockResolvedValueOnce({ rows: badges }) // SELECT tam_badges
    .mockResolvedValueOnce({ rows: [{ total: String(total) }] }) // SUM points
    .mockResolvedValueOnce({ rows: categoryRows }) // category breakdown
    .mockResolvedValueOnce({ rows: awarded }); // already-awarded

  for (let i = 0; i < insertCount; i++) {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT badge
  }
}

describe('TamService', () => {
  let service: TamService;
  let mockPool: { query: jest.Mock; connect: jest.Mock };

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        TamService,
        { provide: DB_POOL, useValue: mockPool },
      ],
    }).compile();

    service = mod.get(TamService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // awardPoints
  // ---------------------------------------------------------------------------
  describe('awardPoints', () => {
    it('inserts a points row with correct values', async () => {
      // awardPoints → INSERT tam_points, then evaluateBadges (4 queries: badges, total, cat, awarded)
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT tam_points
        // evaluateBadges — no badges defined, so only 4 queries, no insert
        .mockResolvedValueOnce({ rows: [] }) // SELECT tam_badges
        .mockResolvedValueOnce({ rows: [{ total: '20' }] }) // SUM points
        .mockResolvedValueOnce({ rows: [] }) // category breakdown
        .mockResolvedValueOnce({ rows: [] }); // already-awarded

      await service.awardPoints('t1', 'u1', 20, 'test reason', 'climate');

      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO tam_points'),
        ['t1', 'u1', 20, 'test reason', 'climate'],
      );
    });

    it('calls evaluateBadges after inserting points', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT tam_points
        .mockResolvedValueOnce({ rows: [] }) // SELECT tam_badges
        .mockResolvedValueOnce({ rows: [{ total: '20' }] }) // SUM points
        .mockResolvedValueOnce({ rows: [] }) // category breakdown
        .mockResolvedValueOnce({ rows: [] }); // already-awarded

      await service.awardPoints('t1', 'u1', 20, 'reason', 'climate');

      // evaluateBadges fetches tam_badges — verify by content, not position
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, threshold_points'),
      );
      expect(mockPool.query).toHaveBeenCalledTimes(5);
    });

    it('uses null for category when not provided', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.awardPoints('t1', 'u1', 10, 'no category');

      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO tam_points'),
        ['t1', 'u1', 10, 'no category', null],
      );
    });
  });

  // ---------------------------------------------------------------------------
  // evaluateBadges
  // ---------------------------------------------------------------------------
  describe('evaluateBadges', () => {
    it('awards "First Step" badge when user reaches 25 total points', async () => {
      const firstStepBadge = { id: 'badge-first-step', thresholdPoints: 25, categoryFilter: null };

      mockEvaluateBadges(
        mockPool,
        [firstStepBadge],
        25,        // totalPoints
        [],        // no category breakdown needed
        [],        // not yet awarded
        1,         // one badge insert expected
      );

      await service.evaluateBadges('t1', 'u1');

      const insertCall = mockPool.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO tam_user_badges'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toEqual(['t1', 'u1', 'badge-first-step']);
    });

    it('does NOT award a badge the user already has', async () => {
      const badge = { id: 'badge-first-step', thresholdPoints: 25, categoryFilter: null };

      mockEvaluateBadges(
        mockPool,
        [badge],
        100,
        [],
        [{ badgeId: 'badge-first-step' }], // already awarded
        0,
      );

      await service.evaluateBadges('t1', 'u1');

      const insertCall = mockPool.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO tam_user_badges'),
      );
      expect(insertCall).toBeUndefined();
    });

    it('does NOT award First Step badge when user has 24 points (below threshold)', async () => {
      const badges = [{ id: 'badge-first-step', thresholdPoints: 25, categoryFilter: null }];
      mockPool.query
        .mockResolvedValueOnce({ rows: badges })               // SELECT badges
        .mockResolvedValueOnce({ rows: [{ total: '24' }] })    // total points (below threshold)
        .mockResolvedValueOnce({ rows: [] })                   // category points
        .mockResolvedValueOnce({ rows: [] });                  // already awarded

      await service.evaluateBadges('t1', 'u1');

      const insertCall = mockPool.query.mock.calls.find(
        ([sql]: [string]) => sql.includes('INSERT INTO tam_user_badges'),
      );
      expect(insertCall).toBeUndefined();
    });

    it('does NOT award "Climate Champion" when 250 points are from poverty category', async () => {
      const climateBadge = { id: 'badge-climate-champ', thresholdPoints: 250, categoryFilter: 'climate' };

      mockEvaluateBadges(
        mockPool,
        [climateBadge],
        300,
        [{ category: 'poverty', total: '300' }], // points only in poverty, none in climate
        [],
        0,
      );

      await service.evaluateBadges('t1', 'u1');

      const insertCall = mockPool.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO tam_user_badges'),
      );
      expect(insertCall).toBeUndefined();
    });

    it('awards "Climate Champion" when user has 250 climate-category points', async () => {
      const climateBadge = { id: 'badge-climate-champ', thresholdPoints: 250, categoryFilter: 'climate' };

      mockEvaluateBadges(
        mockPool,
        [climateBadge],
        250,
        [{ category: 'climate', total: '250' }],
        [],
        1,
      );

      await service.evaluateBadges('t1', 'u1');

      const insertCall = mockPool.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO tam_user_badges'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toEqual(['t1', 'u1', 'badge-climate-champ']);
    });

    it('awards multiple badges when multiple thresholds are crossed simultaneously', async () => {
      const firstStep = { id: 'badge-first-step', thresholdPoints: 25, categoryFilter: null };
      const midTier = { id: 'badge-mid-tier', thresholdPoints: 100, categoryFilter: null };

      // Both badges qualify: total = 150
      mockPool.query
        .mockResolvedValueOnce({ rows: [firstStep, midTier] }) // SELECT tam_badges
        .mockResolvedValueOnce({ rows: [{ total: '150' }] }) // SUM points
        .mockResolvedValueOnce({ rows: [] }) // category breakdown
        .mockResolvedValueOnce({ rows: [] }) // already-awarded — none
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT first-step
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT mid-tier

      await service.evaluateBadges('t1', 'u1');

      const insertCalls = mockPool.query.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO tam_user_badges'),
      );
      expect(insertCalls).toHaveLength(2);
      const insertedBadgeIds = insertCalls.map((c: unknown[]) => (c[1] as unknown[])[2]);
      expect(insertedBadgeIds).toContain('badge-first-step');
      expect(insertedBadgeIds).toContain('badge-mid-tier');
    });
  });

  // ---------------------------------------------------------------------------
  // recordLinkClick (public)
  // ---------------------------------------------------------------------------
  describe('recordLinkClick', () => {
    it('awards 5 pts when first click (rowCount = 1)', async () => {
      // recordLinkClick → INSERT tam_link_clicks (rowCount=1) → awardPoints → INSERT tam_points → evaluateBadges
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT tam_link_clicks
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT tam_points (awardPoints)
        .mockResolvedValueOnce({ rows: [] }) // SELECT tam_badges
        .mockResolvedValueOnce({ rows: [{ total: '5' }] }) // SUM points
        .mockResolvedValueOnce({ rows: [{ category: 'climate', total: '5' }] }) // category
        .mockResolvedValueOnce({ rows: [] }); // already-awarded

      await service.recordLinkClick('post-1', 't1', 'u1', 'climate');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tam_points'),
        expect.arrayContaining([5]),
      );
    });

    it('awards 0 pts when already clicked (rowCount = 0)', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // INSERT tam_link_clicks — conflict, no insert

      await service.recordLinkClick('post-1', 't1', 'u1', 'climate');

      // Should only be 1 query total — no points awarded
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserPoints
  // ---------------------------------------------------------------------------
  describe('getUserPoints', () => {
    it('returns correct totalPoints from a SUM query', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '150' }] });

      const result = await service.getUserPoints('u1', 't1');

      expect(result).toEqual({ userId: 'u1', totalPoints: 150 });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SUM(points)'),
        ['t1', 'u1'],
      );
    });

    it('returns 0 when user has no points', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const result = await service.getUserPoints('u1', 't1');

      expect(result).toEqual({ userId: 'u1', totalPoints: 0 });
    });
  });
});
