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
