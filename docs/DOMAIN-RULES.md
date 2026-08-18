# Domain Rules — Source of Truth

This document summarizes the currently locked v0.2 behavior. Tests may be more detailed, but they must not contradict these rules.

## Base XP

- A local scoring date with at least one qualifying workout earns 100 base XP.
- Additional qualifying workouts on that scoring date do not increase base XP.
- Weight, pace, distance, workout length beyond qualification, body weight, friend performance, group size, and wearable ownership never increase base XP.

## Qualification

| Category | Requirement |
|---|---|
| Strength | >=15 active minutes + >=4 completed working sets with >=1 rep |
| Running | >=15 active minutes |
| Walking/Hiking | >=30 active minutes |
| Cycling | >=20 active minutes |
| Swimming | >=15 active minutes |
| Sport | >=20 active minutes |
| Cardio | >=20 active minutes |
| HIIT | >=12 active minutes |
| Mobility | >=20 active minutes |
| Other | >=20 active minutes |

- `IN_PROGRESS` and `CANCELLED` workouts never qualify.
- Active duration excludes paused time.
- >6-hour workouts are flagged for review and do not automatically qualify.
- Scoring date is the local date at workout start using the recorded timezone-at-start.

## Performance XP

Two independent gates apply:

1. account is at least 168 elapsed hours past onboarding completion;
2. the specific benchmark has at least two prior valid comparable observations.

Benchmark states:

- 0 observations: `UNSEEN`
- 1 observation: `CALIBRATING`
- >=2 observations: `ESTABLISHED`

The first two observations never earn Performance XP. The initial benchmark is the better of those two observations. Observation #3 or later can earn Performance XP if it beats the established benchmark and passes cooldown/validity rules.

Performance tiers:

- <1%: 0 XP
- 1% to <2.5%: +5
- 2.5% to <5%: +10
- 5% to <10%: +15
- >=10%: +25

Maximum daily Performance XP = 25. If multiple workouts improve on the same day, use the highest eligible bonus rather than summing them.

## Benchmark independence

A new measurable benchmark calibrates independently even for an old account.

Examples:

- Bench Press established does not establish Squat.
- Outdoor ~5K does not establish outdoor ~10K.
- Outdoor ~5K does not establish treadmill ~5K.
- Freestyle ~1000m does not establish breaststroke ~1000m.
- HIIT template version 1 does not establish version 2.

## Weekly consistency

`min(qualifying workout dates / weekly target, 1) * 100`

- Monday through Sunday.
- Multiple workouts on one date count once.
- Target changes apply at the next week boundary.
- Weekly-improvement comparison requires the same target.

## Manual history

Current test oracle permits manual scoring for today or yesterday. Older workouts may be stored as history but cannot manufacture retroactive XP or benchmark observations.

## Badges

Badges recognize behavior/milestones but grant no XP in the initial system.
