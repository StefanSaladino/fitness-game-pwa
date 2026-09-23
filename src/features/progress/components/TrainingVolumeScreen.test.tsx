import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { MuscleVolumeSummary } from '../model';
import type { MuscleVolumeRecommendationPayload } from '../muscleVolumeRecommendationModel';
import { TrainingVolumeScreen } from './TrainingVolumeScreen';

const profile: OnboardingProfile = {
  id: 'user-1',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-18T00:00:00Z',
  preferredWeightUnit: 'KG',
};

const rows: MuscleVolumeSummary[] = [
  {
    muscleGroup: 'CHEST',
    windowDays: 7,
    windowStart: '2026-09-13',
    windowEnd: '2026-09-19',
    methodologyVersion: 'muscle-volume-v2',
    effectiveSets: 9,
    directEffectiveSets: 8,
    indirectEffectiveSets: 1,
    eligibleLogicalSets: 6,
    eligibleStages: 13,
    reviewFlaggedLogicalSets: 0,
    targetMin: 10,
    targetMidpoint: 14,
    targetMax: 18,
    highReviewAbove: 20,
    volumeStatus: 'BELOW_TARGET',
    benchmarkEvidenceConfidence: 'MODERATE',
    highConfidenceEffectiveSets: 7.5,
    mediumConfidenceEffectiveSets: 1,
    lowOrProvisionalEffectiveSets: 0.5,
    provisionalEffectiveSets: 0,
    highConfidenceProportion: 0.833333,
    mediumConfidenceProportion: 0.111111,
    lowOrProvisionalProportion: 0.055556,
  },
  {
    muscleGroup: 'LATS',
    windowDays: 7,
    windowStart: '2026-09-13',
    windowEnd: '2026-09-19',
    methodologyVersion: 'muscle-volume-v2',
    effectiveSets: 14,
    directEffectiveSets: 12,
    indirectEffectiveSets: 2,
    eligibleLogicalSets: 10,
    eligibleStages: 14,
    reviewFlaggedLogicalSets: 0,
    targetMin: 8,
    targetMidpoint: 11,
    targetMax: 14,
    highReviewAbove: 18,
    volumeStatus: 'ON_TARGET',
    benchmarkEvidenceConfidence: 'MODERATE_HIGH',
    highConfidenceEffectiveSets: 14,
    mediumConfidenceEffectiveSets: 0,
    lowOrProvisionalEffectiveSets: 0,
    provisionalEffectiveSets: 0,
    highConfidenceProportion: 1,
    mediumConfidenceProportion: 0,
    lowOrProvisionalProportion: 0,
  },
  {
    muscleGroup: 'NECK',
    windowDays: 7,
    windowStart: '2026-09-13',
    windowEnd: '2026-09-19',
    methodologyVersion: 'muscle-volume-v2',
    effectiveSets: 7,
    directEffectiveSets: 7,
    indirectEffectiveSets: 0,
    eligibleLogicalSets: 7,
    eligibleStages: 7,
    reviewFlaggedLogicalSets: 0,
    targetMin: 6,
    targetMidpoint: 7.5,
    targetMax: 9,
    highReviewAbove: 10,
    volumeStatus: 'ON_TARGET',
    benchmarkEvidenceConfidence: 'LOW',
    highConfidenceEffectiveSets: 0,
    mediumConfidenceEffectiveSets: 0,
    lowOrProvisionalEffectiveSets: 7,
    provisionalEffectiveSets: 7,
    highConfidenceProportion: 0,
    mediumConfidenceProportion: 0,
    lowOrProvisionalProportion: 1,
  },
  {
    muscleGroup: 'CHEST',
    windowDays: 28,
    windowStart: '2026-08-23',
    windowEnd: '2026-09-19',
    methodologyVersion: 'muscle-volume-v2',
    effectiveSets: 44,
    directEffectiveSets: 40,
    indirectEffectiveSets: 4,
    eligibleLogicalSets: 31,
    eligibleStages: 45,
    reviewFlaggedLogicalSets: 0,
    targetMin: 40,
    targetMidpoint: 56,
    targetMax: 72,
    highReviewAbove: 80,
    volumeStatus: 'ON_TARGET',
    benchmarkEvidenceConfidence: 'MODERATE',
    highConfidenceEffectiveSets: 40,
    mediumConfidenceEffectiveSets: 4,
    lowOrProvisionalEffectiveSets: 0,
    provisionalEffectiveSets: 0,
    highConfidenceProportion: 0.909091,
    mediumConfidenceProportion: 0.090909,
    lowOrProvisionalProportion: 0,
  },
];

const recommendation: MuscleVolumeRecommendationPayload = {
  muscleGroup: 'CHEST',
  windowDays: 7,
  performance: {
    trend: 'PLATEAU',
    persistence: 'SUSTAINED',
    confidence: 'MODERATE',
    evidenceCount: 7,
    exerciseCount: 2,
    spanDays: 30,
    overallChange: 0.005,
    recentChange: 0,
    variability: 0.02,
  },
  sources: [{
    exerciseId: 'bench',
    canonicalName: 'Barbell Bench Press',
    contributionRole: 'DIRECT',
    contributionWeight: 1,
    observationCount: 4,
    latestObservedAt: '2026-09-18T12:00:00Z',
    latestRelativePerformanceIndex: 1,
  }],
  recommendation: {
    muscleGroup: 'CHEST',
    windowDays: 7,
    action: 'ADD_VOLUME_CAUTIOUSLY',
    volumeAssessment: {
      muscleGroup: 'CHEST',
      windowDays: 7,
      status: 'BELOW_TARGET',
      effectiveSets: 9,
      targetMin: 10,
      targetMax: 18,
      highReviewAbove: 20,
      deficitToTargetMin: 1,
      excessAboveTargetMax: 0,
      excessAboveHighReview: 0,
      volumeEvidenceLimited: false,
    },
    performance: {
      trend: 'PLATEAU',
      persistence: 'SUSTAINED',
      confidence: 'MODERATE',
      evidenceCount: 7,
      exerciseCount: 2,
      spanDays: 30,
      overallChange: 0.005,
      recentChange: 0,
      variability: 0.02,
    },
    suggestedEffectiveSetChange: 1,
    headline: 'Add a small amount of volume',
    rationale: 'Volume is below target and the plateau is sustained.',
  },
};

describe('TrainingVolumeScreen', () => {
  it('uses a dedicated, icon-supported muscle-volume surface and switches windows', async () => {
    const user = userEvent.setup();

    render(
      <TrainingVolumeScreen
        error=""
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        onRetry={vi.fn()}
        onSignOut={vi.fn()}
        profile={profile}
        rows={rows}
        status="ready"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Volume targets' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chest' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lats' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Neck' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-muscle-volume-card] img')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '28 days' }));

    expect(screen.getByRole('button', { name: '28 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Chest' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lats' })).not.toBeInTheDocument();
    expect(screen.getByText('44', { selector: 'strong' })).toBeInTheDocument();
  });

  it('keeps each muscle group collapsed by default and expands it independently', async () => {
    const user = userEvent.setup();

    render(
      <TrainingVolumeScreen
        error=""
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        onRetry={vi.fn()}
        onSignOut={vi.fn()}
        profile={profile}
        rows={rows}
        status="ready"
      />,
    );

    const chestSummary = screen.getByLabelText('Chest volume details');
    const backSummary = screen.getByLabelText('Lats volume details');
    const chestDetails = chestSummary.closest('details');
    const backDetails = backSummary.closest('details');

    expect(chestDetails).not.toHaveAttribute('open');
    expect(backDetails).not.toHaveAttribute('open');
    expect(screen.getAllByText('Details').length).toBeGreaterThan(0);

    await user.click(chestSummary);

    expect(chestDetails).toHaveAttribute('open');
    expect(backDetails).not.toHaveAttribute('open');

    await user.click(chestSummary);

    expect(chestDetails).not.toHaveAttribute('open');
  });

  it('renders the performance trend and recommendation alongside the matching muscle/window', () => {
    render(
      <TrainingVolumeScreen
        error=""
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        onRetry={vi.fn()}
        onSignOut={vi.fn()}
        profile={profile}
        recommendationStatus="ready"
        recommendations={[recommendation]}
        rows={rows}
        status="ready"
      />,
    );

    expect(screen.getByText('Plateau')).toBeInTheDocument();
    expect(screen.getByText('Add cautiously')).toBeInTheDocument();
    expect(screen.getByText('+1 effective sets · next 7 days')).toBeInTheDocument();
    expect(screen.getByText(/Evidence: Barbell Bench Press/i)).toBeInTheDocument();
  });

  it('keeps descriptive volume visible when performance analysis fails', () => {
    render(
      <TrainingVolumeScreen
        error=""
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        onRetry={vi.fn()}
        onSignOut={vi.fn()}
        profile={profile}
        recommendationError="Performance context unavailable"
        recommendationStatus="error"
        rows={rows}
        status="ready"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Chest' })).toBeInTheDocument();
    expect(screen.getByText('Performance context unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry performance analysis' })).toBeInTheDocument();
  });

  it('provides an explicit route back to Progress', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <TrainingVolumeScreen
        error=""
        onBack={onBack}
        onNavigate={vi.fn()}
        onRetry={vi.fn()}
        onSignOut={vi.fn()}
        profile={profile}
        rows={rows}
        status="ready"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Back to Progress' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
