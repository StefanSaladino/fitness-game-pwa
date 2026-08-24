# Phase 16.4 — Home / lifting dashboard

## Status

**DONE.**

Phase 16.4 implements the approved Home visual direction over the existing persisted lifting dashboard read model. It changes presentation and responsive composition only; no scoring, authorization, persistence, group-membership, badge-award, cardio, or workout-recovery semantics change.

## Approved visual contract

The implemented dashboard uses the existing Top Set visual system and the approved Phase 16 anti-template rules:

- near-black application background with charcoal surfaces;
- warm orange as the primary interaction/section accent;
- green only for real completion/success/earned states;
- flat sections, dividers, and dense rows instead of a wall of equal-weight KPI cards;
- no glass/frosted panels, neon glow, decorative gradients, circular progress donuts, fake charts, level systems, invented streaks, or marketing copy;
- one purposeful fitness image only: `src/assets/fitness/top-set-plate-banner.jpg`;
- the photograph is a restrained responsive banner and never carries data, instructions, permissions, or controls.

## Real pathways preserved

The Home screen exposes only routes that already exist in the application:

- **Start Lift** -> existing `workouts` section;
- **Log cardio** -> existing secondary `cardio` section;
- **View competition** -> existing `compete` section when group context exists;
- Profile/Settings remains the separate account control owned by the shared shell;
- primary navigation remains Home, Lift, Groups, Progress, Compete.

No Exercises primary tab, notification shortcut, workout-plan shortcut, recommended workout, watch UI, or new navigation destination is introduced.

## Real dashboard data used

The screen is driven only by the current `DashboardSnapshot` and existing profile/group contracts:

- weekly lifting target and completed qualifying lifting dates;
- weekly lifting-v1 XP;
- workout, exercise-completion, progression, and cardio-bonus XP breakdown;
- recent completed strength sessions;
- recent persisted personal records;
- completed-week consistency streaks and goals hit;
- already-earned badge definitions and earned timestamps;
- membership-gated weekly group leaderboard;
- current-user and group-member profile pictures.

The fixture values shown in automated component tests are test data only and are not product constants.

## Responsive behavior

### Phone

- the photographic lifting-week banner leads the page;
- Start Lift and Log cardio remain immediately reachable;
- weekly target, XP, recent lift, PR, badges, and group rank become a single readable vertical flow;
- the existing shared mobile bottom navigation remains edge-to-edge and safe-area aware;
- no horizontal dashboard overflow is introduced.

### Desktop

- the shared five-item desktop rail remains authoritative;
- the lifting-week banner expands horizontally without becoming a marketing hero;
- weekly target and XP share one flat overview row;
- recent lifts/PRs and consistency/group rank use two-column information layouts where width permits;
- the account identity remains secondary to the workout action.

## Empty/loading/error behavior

- existing dashboard loading and retryable error states remain intact;
- zero recent lifts and zero PRs retain explanatory empty copy;
- zero earned badges retains an earned-badge empty state without exposing fake locked badges;
- zero group membership retains the complete personal lifting dashboard and clearly states that group membership is optional;
- a group with no ranking data shows an explicit no-ranking state.

## Accessibility

- the weekly target remains labeled with a readable completed-day count;
- navigation/actions stay semantic buttons supplied by the shared UI layer;
- the gym photograph is decorative and therefore has empty alternative text;
- earned/success state is not communicated by color alone because labels and values remain visible;
- narrow-screen content remains DOM ordered for normal reading and keyboard flow;
- the change introduces no motion dependency.

## Validation expectations

Phase 16.4 should pass:

- TypeScript;
- focused dashboard component tests;
- full unit tests;
- integration tests;
- production build and bundle budget;
- structural validation, including the dedicated Phase 16.4 contract validator;
- browser E2E;
- internal lifting-v1 assertions.

No database migration or hosted SQL mutation is required for Phase 16.4.

## Next visual slice

Phase 16.5 — Active workout + set logging.
