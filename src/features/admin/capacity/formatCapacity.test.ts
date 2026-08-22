import { describe, expect, it } from 'vitest';
import { capacityStatusLabel, formatCapacityLimit, formatCapacityValue, formatUtilization } from './formatCapacity';

describe('capacity formatting', () => {
  it('formats bytes and counts without fake precision', () => {
    expect(formatCapacityValue({ unit: 'bytes', value: 16_796_819 })).toBe('16 MB');
    expect(formatCapacityValue({ unit: 'count', value: 6 })).toBe('6');
  });

  it('labels missing allowances and real utilization honestly', () => {
    expect(formatCapacityLimit({ unit: 'bytes', limit: null })).toBe('No allowance configured');
    expect(formatUtilization({ utilizationPercent: 10 })).toBe('10%');
    expect(formatUtilization({ utilizationPercent: null })).toBeNull();
    expect(capacityStatusLabel('UNCONFIGURED')).toBe('Unconfigured');
  });
});
