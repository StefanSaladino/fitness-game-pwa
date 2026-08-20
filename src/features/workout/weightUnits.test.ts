import { describe, expect, it } from 'vitest';
import { displayWeightToKg, formatWeightInput, kgToDisplayWeight } from './weightUnits';

describe('workout weight display conversion', () => {
  it('keeps canonical kilograms unchanged for kg display', () => {
    expect(displayWeightToKg(100, 'KG')).toBe(100);
    expect(kgToDisplayWeight(100, 'KG')).toBe(100);
  });

  it('converts pounds for display without changing canonical kg storage', () => {
    expect(displayWeightToKg(220.46, 'LB')).toBeCloseTo(100, 2);
    expect(kgToDisplayWeight(100, 'LB')).toBeCloseTo(220.46, 2);
  });

  it('formats null weights as an empty entry field', () => {
    expect(formatWeightInput(null, 'KG')).toBe('');
  });
});
