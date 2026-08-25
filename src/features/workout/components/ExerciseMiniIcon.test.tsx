import { describe, expect, it } from 'vitest';
import { exerciseMiniIconKind } from './ExerciseMiniIcon';

describe('exerciseMiniIconKind', () => {
  it('maps common lift families to the approved silhouettes', () => {
    expect(exerciseMiniIconKind('Barbell Bench Press')).toBe('bench-press');
    expect(exerciseMiniIconKind('Incline Dumbbell Bench Press')).toBe('incline-press');
    expect(exerciseMiniIconKind('Back Squat')).toBe('back-squat');
    expect(exerciseMiniIconKind('Conventional Deadlift')).toBe('deadlift');
    expect(exerciseMiniIconKind('Dumbbell Shoulder Press')).toBe('overhead-press');
    expect(exerciseMiniIconKind('Alternating Dumbbell Curl')).toBe('dumbbell-curl');
  });

  it('uses the generic weight icon when no approved silhouette is mapped', () => {
    expect(exerciseMiniIconKind('Cable Lateral Raise')).toBe('generic-weight');
    expect(exerciseMiniIconKind('Pull Up')).toBe('generic-weight');
    expect(exerciseMiniIconKind('Goblet Squat')).toBe('generic-weight');
    expect(exerciseMiniIconKind('Front Squat')).toBe('generic-weight');
    expect(exerciseMiniIconKind('Romanian Deadlift')).toBe('generic-weight');
    expect(exerciseMiniIconKind('Cable Curl')).toBe('generic-weight');
    expect(exerciseMiniIconKind('Preacher Curl')).toBe('generic-weight');
  });
});
