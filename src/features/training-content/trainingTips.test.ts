import { describe, expect, it } from 'vitest';
import { trainingTipForDate, trainingTips } from './trainingTips';

describe('training tips', () => {
  it('returns a stable tip for the same user and UTC date', () => {
    const date = new Date('2026-08-23T12:00:00.000Z');
    expect(trainingTipForDate(date, 'user-1')).toEqual(trainingTipForDate(date, 'user-1'));
  });

  it('only returns general or workout-relevant content when workout context is requested', () => {
    const tip = trainingTipForDate(new Date('2026-08-24T12:00:00.000Z'), 'user-2', 'WORKOUT');
    expect(['GENERAL', 'WORKOUT']).toContain(tip.context);
  });

  it('keeps the curated library free of empty copy', () => {
    expect(trainingTips.length).toBeGreaterThanOrEqual(10);
    for (const tip of trainingTips) {
      expect(tip.id.trim()).not.toBe('');
      expect(tip.title.trim()).not.toBe('');
      expect(tip.body.trim()).not.toBe('');
    }
  });
});
