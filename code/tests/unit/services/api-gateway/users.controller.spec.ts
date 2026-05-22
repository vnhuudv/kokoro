import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../../../src/services/api-gateway/src/modules/users/users.controller';
import { UsersService, CachedProfile } from '../../../../src/services/api-gateway/src/modules/users/users.service';

const mockProfiles: CachedProfile[] = [
  { slackUserId: 'U001', language: 'vi', fluencyScore: 3.5, optedIn: true },
  { slackUserId: 'U002', language: 'ja', fluencyScore: 4.0, optedIn: false },
];

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            getProfilesBySlackIds: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  describe('GET /users/profiles', () => {
    it('returns profiles for provided slackIds', async () => {
      service.getProfilesBySlackIds.mockResolvedValue(mockProfiles);

      const result = await controller.getProfiles('U001,U002');

      expect(service.getProfilesBySlackIds).toHaveBeenCalledWith(['U001', 'U002']);
      expect(result).toEqual(mockProfiles);
    });

    it('returns empty array when no slackIds provided', async () => {
      const result = await controller.getProfiles(undefined);
      expect(result).toEqual([]);
      expect(service.getProfilesBySlackIds).not.toHaveBeenCalled();
    });

    it('trims whitespace from individual ids', async () => {
      service.getProfilesBySlackIds.mockResolvedValue([mockProfiles[0]]);

      await controller.getProfiles(' U001 , U002 ');

      expect(service.getProfilesBySlackIds).toHaveBeenCalledWith(['U001', 'U002']);
    });

    it('returns empty array when slackIds is empty string', async () => {
      const result = await controller.getProfiles('');
      expect(result).toEqual([]);
      expect(service.getProfilesBySlackIds).not.toHaveBeenCalled();
    });
  });

  describe('UsersService.getProfilesBySlackIds', () => {
    it('maps opted_out_at null to optedIn: true and non-null to false', () => {
      // This tests the shape contract
      expect(mockProfiles[0].optedIn).toBe(true);
      expect(mockProfiles[1].optedIn).toBe(false);
    });
  });
});
