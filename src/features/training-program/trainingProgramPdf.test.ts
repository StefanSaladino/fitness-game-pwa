import { describe, expect, it } from 'vitest';
import type { PersistedTrainingProgram } from './trainingProgramPersistenceService';
import {
  generateTrainingProgramPdf,
  printableTrainingProgramSetRowCount,
  trainingProgramPdfFileName,
} from './trainingProgramPdf';

function program(): PersistedTrainingProgram {
  const workouts: PersistedTrainingProgram['workouts'] = [
    '2026-09-28',
    '2026-10-05',
    '2026-10-12',
    '2026-10-19',
  ].map((scheduledDate, weekIndex) => ({
    id: `planned-${weekIndex}`,
    weekIndex,
    sessionIndex: 0,
    scheduledDate,
    title: 'Full Body',
    executionStatus: weekIndex === 0 ? 'COMPLETED_PROGRAMMED' : 'PLANNED',
    workoutSessionId: weekIndex === 0 ? 'session-1' : null,
    revision: 0,
    exercises: [{
      exerciseId: 'squat',
      canonicalName: 'Back Squat',
      targetMuscleGroup: 'QUADS',
      targetContributionRole: 'DIRECT',
      selectionIntent: 'COMPOUND',
      measurementType: 'WEIGHT_REPS',
      orderIndex: 0,
      workingSets: 3,
      repsMin: 5,
      repsMax: 8,
      targetWeightKg: 100,
      bodyweightMode: null,
      supersetGroupIndex: null,
      supersetOrder: null,
    }],
  }));

  return {
    id: 'program-1',
    status: 'ACTIVE',
    revision: 3,
    definition: {
      version: 'training-program-v1',
      goal: 'BALANCED',
      weeks: 4,
      sessionsPerWeek: 1,
      source: {
        generatorVersion: 'training-program-v1',
        generatedAt: '2026-09-24T10:00:00Z',
        historyThroughDate: '2026-09-24',
        muscleVolumeMethodologyVersion: 'muscle-volume-v2',
        profileRevision: 2,
        constraintRevision: 1,
        durationWeeks: 4,
        startDate: '2026-09-28',
        trainingDays: ['MONDAY'],
        requestedSplit: 'AUTO',
        resolvedSplit: 'FULL_BODY',
      },
      workouts: workouts.map((workout) => ({
        weekIndex: workout.weekIndex,
        sessionIndex: workout.sessionIndex,
        scheduledDate: workout.scheduledDate,
        title: workout.title,
        exercises: workout.exercises,
      })),
    },
    workouts,
  };
}

describe('training program PDF', () => {
  it('uses a stable program filename', () => {
    expect(trainingProgramPdfFileName(program()))
      .toBe('top-set-program-2026-09-28.pdf');
  });

  it('generates a real PDF from the persisted current prescription', async () => {
    const bytes = await generateTrainingProgramPdf(program(), 'Test User');
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });
});
  it('provides printable write-in rows for planned and extra sets', () => {
    expect(printableTrainingProgramSetRowCount(1)).toBe(3);
    expect(printableTrainingProgramSetRowCount(3)).toBe(4);
    expect(printableTrainingProgramSetRowCount(8)).toBe(8);
  });

