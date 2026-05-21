import { calculateCarbon, toKmEquivalent, CARBON_INTENSITY } from
  '../../src/services/api-gateway/src/modules/inochi/inochi.types';

describe('calculateCarbon', () => {
  it('uses the correct intensity for anthropic', () => {
    const kg = calculateCarbon(1000, 0, 'anthropic');
    expect(kg).toBeCloseTo(0.000029, 8);
  });

  it('sums input and output tokens', () => {
    const kg = calculateCarbon(500, 500, 'anthropic');
    expect(kg).toBeCloseTo(0.000029, 8);
  });

  it('falls back to "other" intensity for unknown provider', () => {
    const kg = calculateCarbon(1000, 0, 'unknown_provider');
    expect(kg).toBeCloseTo(CARBON_INTENSITY.other, 8);
  });
});

describe('toKmEquivalent', () => {
  it('converts kg CO2e to km in petrol car', () => {
    expect(toKmEquivalent(0.171)).toBeCloseTo(1.0, 1);
  });
});

import { InochiService } from
  '../../src/services/api-gateway/src/modules/inochi/inochi.service';
import { Pool } from 'pg';

describe('InochiService.getPersonalCarbon', () => {
  const mockPool = {
    query: jest.fn(),
  } as unknown as Pool;

  beforeEach(() => jest.clearAllMocks());

  it('returns summary with offset_covered true when a covering offset exists', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{
          tool: 'kokoro', provider: 'anthropic', source: 'gateway',
          input_tokens: '1000', output_tokens: '500',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ covered: true }] });

    const svc = new InochiService(mockPool);
    const result = await svc.getPersonalCarbon('user-uuid-1', '2026-05');

    expect(result.offset_covered).toBe(true);
    expect(result.total_tokens).toBe(1500);
    expect(result.total_kg_co2e).toBeGreaterThan(0);
  });

  it('returns offset_covered false when no offset covers the period', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ covered: false }] });

    const svc = new InochiService(mockPool);
    const result = await svc.getPersonalCarbon('user-uuid-1', '2026-05');

    expect(result.offset_covered).toBe(false);
    expect(result.total_kg_co2e).toBe(0);
  });
});
