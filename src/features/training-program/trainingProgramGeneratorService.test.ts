import { describe, expect, it, vi } from 'vitest';
import type { ExerciseProgressService } from '../progress/progressService';
import type { MusclePerformanceService } from '../progress/musclePerformanceService';
import type { TrainingProgramCandidateService } from './trainingProgramCandidateService';
import type { TrainingProgramGeneratorProfileService } from './trainingProgramGeneratorProfileService';
import { createTrainingProgramGeneratorService } from './trainingProgramGeneratorService';

describe('training program generator service', () => {
  it('requires persisted goal and frequency instead of inventing preferences', async () => {
    const profileService = {
      load: vi.fn(async () => ({
        userId: 'user-1',
        accessMode: 'COMMERCIAL_GYM' as const,
        equipmentKeys: [],
        goal: null,
        sessionsPerWeek: null,
        revision: 2,
        createdAt: '2026-09-22T20:00:00Z',
        updatedAt: '2026-09-22T20:00:00Z',
      })),
      updatePreferences: vi.fn(),
    } satisfies TrainingProgramGeneratorProfileService;

    const service = createTrainingProgramGeneratorService(undefined, {
      profileService,
      candidateService: {
        load: vi.fn(),
      } as unknown as TrainingProgramCandidateService,
      progressService: {} as ExerciseProgressService,
      performanceService: {} as MusclePerformanceService,
    });

    await expect(service.generate({
      userId: 'user-1',
      generatedAt: '2026-09-22T21:00:00Z',
      historyThroughDate: '2026-09-22',
    })).rejects.toThrow('goal and weekly frequency');
  });
});
