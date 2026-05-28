import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MakotoService } from './makoto.service';
import { DB_POOL } from '../database/database.module';

describe('MakotoService', () => {
  let service: MakotoService;
  let mockPool: { query: jest.Mock };

  beforeEach(async () => {
    mockPool = { query: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [
        MakotoService,
        { provide: DB_POOL, useValue: mockPool },
      ],
    }).compile();
    service = mod.get(MakotoService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // toggleReaction
  // ---------------------------------------------------------------------------
  describe('toggleReaction', () => {
    it('returns liked:true and count:1 on first call (insert succeeds)', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 1 })          // INSERT (inserted)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // SELECT COUNT

      const result = await service.toggleReaction('post-1', 'tenant-1', 'user-1');

      expect(result).toEqual({ liked: true, count: 1 });
    });

    it('returns liked:false and count:0 on second call (conflict → delete)', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 0 })          // INSERT (conflict)
        .mockResolvedValueOnce({ rowCount: 1 })          // DELETE
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // SELECT COUNT

      const result = await service.toggleReaction('post-1', 'tenant-1', 'user-1');

      expect(result).toEqual({ liked: false, count: 0 });
    });
  });

  // ---------------------------------------------------------------------------
  // addComment
  // ---------------------------------------------------------------------------
  describe('addComment', () => {
    it('throws BadRequestException when parentId points to an existing reply', async () => {
      // parent comment itself has a parent_id set (depth > 1)
      mockPool.query.mockResolvedValueOnce({
        rows: [{ parentId: 'grandparent-id' }], // parent already has a parent
      });

      await expect(
        service.addComment('post-1', 'tenant-1', 'user-1', {
          body: 'nested reply',
          parentId: 'parent-comment-id',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('inserts a top-level comment when no parentId is given', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'comment-1',
          tenantId: 'tenant-1',
          postId: 'post-1',
          parentId: null,
          authorUserId: 'user-1',
          body: 'great article',
          createdAt: new Date('2026-05-28'),
        }],
      });

      const result = await service.addComment('post-1', 'tenant-1', 'user-1', {
        body: 'great article',
      });

      expect(result.id).toBe('comment-1');
      expect(result.parentId).toBeNull();
      expect(result.replies).toEqual([]);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO makoto_comments'),
        expect.arrayContaining(['tenant-1', 'post-1', null, 'user-1', 'great article']),
      );
    });

    it('throws NotFoundException when parentId does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // parent comment not found

      await expect(
        service.addComment('post-1', 'tenant-1', 'user-1', {
          body: 'reply to ghost',
          parentId: 'nonexistent-comment-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteComment
  // ---------------------------------------------------------------------------
  describe('deleteComment', () => {
    it('deletes comment when userId matches author', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ authorUserId: 'user-1' }] }) // SELECT
        .mockResolvedValueOnce({ rowCount: 1 });                        // DELETE

      await expect(
        service.deleteComment('comment-1', 'tenant-1', 'user-1'),
      ).resolves.toBeUndefined();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM makoto_comments'),
        expect.arrayContaining(['comment-1', 'tenant-1']),
      );
    });

    it('throws ForbiddenException when userId does not match author', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ authorUserId: 'other-user' }],
      });

      await expect(
        service.deleteComment('comment-1', 'tenant-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when comment does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.deleteComment('comment-1', 'tenant-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
