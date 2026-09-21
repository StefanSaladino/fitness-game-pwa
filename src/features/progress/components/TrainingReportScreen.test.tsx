import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { CompletedTrainingReport } from '../trainingReportModel';
import { TrainingReportScreen } from './TrainingReportScreen';

const profile: OnboardingProfile = {
  id:'user-1', username:'stefan', displayName:'Stefan', timezone:'America/Toronto', weeklyWorkoutTarget:4,
  pendingWeeklyWorkoutTarget:null, onboardingCompletedAt:'2026-08-18T00:00:00Z', preferredWeightUnit:'KG',
};

const report: CompletedTrainingReport = {
  reportVersion:'training-report-v1', methodologyVersion:'muscle-volume-v1',
  period:{ periodKind:'MONTH', periodStart:'2026-08-01', periodEnd:'2026-08-31', completedLiftingSessions:10,
    activeTrainingSeconds:36000, exerciseCount:18, completedWorkingSets:140, volumeKgReps:72000, prCount:4 },
  previousPeriod:{ periodKind:'MONTH', periodStart:'2026-07-01', periodEnd:'2026-07-31', completedLiftingSessions:8,
    activeTrainingSeconds:30000, exerciseCount:16, completedWorkingSets:125, volumeKgReps:65000, prCount:2 },
  delta:{ completedLiftingSessions:2, activeTrainingSeconds:6000, exerciseCount:2, completedWorkingSets:15, volumeKgReps:7000, prCount:2 },
  statusCounts:{ onTarget:0, belowTarget:1, aboveTarget:0, noData:0 },
  actionCounts:{ add:1, reduce:0, maintain:0, holdReview:0, monitor:0, noAction:0 },
  muscles:[{
    snapshot:{ muscleGroup:'CHEST', methodologyVersion:'muscle-volume-v1', periodEffectiveSets:30,
      periodDirectEffectiveSets:26, periodIndirectEffectiveSets:4, benchmarkWindowDays:28,
      benchmarkEquivalentEffectiveSets:27.1, benchmarkEquivalentDirectEffectiveSets:23.5,
      benchmarkEquivalentIndirectEffectiveSets:3.6, targetMin:40, targetMidpoint:56, targetMax:72,
      highReviewAbove:80, volumeStatus:'BELOW_TARGET', benchmarkEvidenceConfidence:'MODERATE',
      highConfidenceProportion:1, mediumConfidenceProportion:0, lowOrProvisionalProportion:0,
      provisionalEffectiveSets:0, eligibleLogicalSets:30, eligibleStages:30, reviewFlaggedLogicalSets:0 },
    performance:{ trend:'PLATEAU', persistence:'SUSTAINED', confidence:'HIGH', evidenceCount:8,
      exerciseCount:2, spanDays:35, overallChange:0.01, recentChange:0, variability:0.02 },
    sources:[],
    recommendation:{
      muscleGroup:'CHEST',
      windowDays:28,
      action:'ADD_VOLUME_CAUTIOUSLY',
      volumeAssessment:{
        muscleGroup:'CHEST',
        windowDays:28,
        status:'BELOW_TARGET',
        effectiveSets:27.1,
        targetMin:40,
        targetMax:72,
        highReviewAbove:80,
        deficitToTargetMin:13,
        excessAboveTargetMax:0,
        excessAboveHighReview:0,
        volumeEvidenceLimited:false,
      },
      performance:{ trend:'PLATEAU', persistence:'SUSTAINED', confidence:'HIGH', evidenceCount:8,
        exerciseCount:2, spanDays:35, overallChange:0.01, recentChange:0, variability:0.02 },
      headline:'Add a small amount of volume',
      rationale:'Volume is below target and the plateau is sustained.',
      suggestedEffectiveSetChange:2,
    },
    correctivePlan:{ action:'ADD_VOLUME_CAUTIOUSLY', weeklyEffectiveSetAdjustment:2,
      headline:'Add a small amount of volume', rationale:'Volume is below target and the plateau is sustained.',
      preferredExercises:['Barbell Bench Press','Cable Chest Fly'] },
  }],
};

describe('TrainingReportScreen',()=>{
  it('acts as a decision review without repeating Progress raw analytics or Volume Target detail',()=>{
    render(<TrainingReportScreen canGoNext={false} error="" onBack={vi.fn()} onNavigate={vi.fn()} onNext={vi.fn()}
      onPrevious={vi.fn()} onRetry={vi.fn()} onSetPeriodKind={vi.fn()} onSignOut={vi.fn()} periodKind="MONTH"
      profile={profile} report={report} status="ready" />);

    expect(screen.getByRole('heading',{name:'What changed. What to do next.'})).toBeInTheDocument();
    expect(screen.getByText('August 2026')).toBeInTheDocument();
    expect(screen.getByText('10 hr')).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Next 7 days'})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Chest'})).toBeInTheDocument();
    expect(screen.getByText('+2 effective sets')).toBeInTheDocument();
    expect(screen.getByText('Add a small amount of volume')).toBeInTheDocument();
    expect(screen.getByText(/Barbell Bench Press/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download monthly pdf/i })).toBeInTheDocument();

    expect(screen.queryByText('Lifting sessions')).not.toBeInTheDocument();
    expect(screen.queryByText('Working sets')).not.toBeInTheDocument();
    expect(screen.queryByText('Volume load')).not.toBeInTheDocument();
    expect(screen.queryByText('PRs')).not.toBeInTheDocument();
    expect(screen.queryByText('28-day equivalent')).not.toBeInTheDocument();
    expect(screen.queryByText('Direct / indirect')).not.toBeInTheDocument();
    expect(screen.queryByText('Target')).not.toBeInTheDocument();
  });
});
