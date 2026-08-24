# Phase 16.3 — Onboarding + optional group discovery

## Status

**APPROVED CONCEPT — VISUAL-SYSTEM OVERHAUL PATCH PREPARED.**

The first implementation pass preserved the correct product behavior but remained visually coupled to the old navy/blue Phase 5/16.1 foundation. This pass corrects that mismatch at the shared-theme, shell, and page-composition layers.

## Grounded product contract

Phase 16.3 remains presentation-only. It does not add onboarding questions, public group discovery, reusable invite codes, new persistence, or new group semantics.

### Profile onboarding

The only persisted first-run profile inputs remain:

- username;
- display name;
- timezone;
- weekly lifting target from 1–7.

After successful completion the persisted profile is reloaded and the existing application flow continues. There is no completion/celebration screen and no fake setup stepper.

### Optional groups

A completed profile may enter the personal product with zero groups.

The grounded zero-group choices are:

- create a group by name;
- return to Home and continue solo.

When a targeted invitation exists, the invitation state shows:

- group name;
- inviter display name;
- inviter username;
- Accept;
- Decline;
- Go to Home.

The invitation proposal intentionally does not duplicate the Create group form underneath the invitation card. The user can decline/leave the invitation state and return to the normal zero-group Groups page.

## Shared Top Set visual-system migration

Phase 16.3 now establishes the visual foundation that the remaining Phase 16 page migrations will inherit:

- near-black page background;
- solid charcoal surfaces;
- warm orange as the primary interaction/active accent;
- neutral white/gray typography;
- green remains reserved for semantic success rather than becoming a general brand accent;
- no blue navigation active state;
- no green/cyan/blue primary-button gradient;
- no global radial blue/green page glow;
- no glass/frosted shell treatment;
- flatter radii and restrained shadows.

Existing compatibility token names such as `--color-blue` remain temporarily aliased to the Top Set accent so pre-migration feature styles do not reintroduce the old blue identity accidentally. New Phase 16 work should use the explicit accent tokens.

## Approved phone composition

### Profile setup

The implementation follows the approved concept more literally:

- the supplied bench/dumbbell/water-bottle gym image spans the full phone width at the top;
- no extra marketing logo/slogan is overlaid on the phone composition;
- the form starts directly below the image on the same near-black page;
- heading and support copy stay compact;
- fields use dark flat controls;
- weekly-target choices are compact, with the selected day count in orange;
- one full-width orange **Complete setup** action.

### Groups — zero memberships

- authenticated top bar reads **Groups**;
- Profile/Settings remains available through the real account control rather than inventing a notification bell;
- centered purposeful groups empty-state icon;
- **Groups are optional.** heading and short copy;
- one Create your group surface;
- one divider;
- one full-width **Go to Home** action;
- existing bottom navigation remains real and uses the orange active state.

### Groups — targeted invitation

- authenticated top bar still reads **Groups**;
- **Pending invitations** heading;
- invitation surface contains only real group/inviter data;
- derived group initials are decorative only and do not invent profile/group metadata;
- Decline + Accept;
- divider;
- **No thanks** / Groups are optional;
- **Go to Home**.

## Loading and error states

The old generic `auth-shell` loading placeholders are replaced by a reusable `TopSetLoadingScreen`:

- centered Top Set mark;
- small indeterminate orange loading line;
- plain status copy;
- no percentage or fabricated progress;
- reduced-motion-safe behavior.

It is used for session loading, lazy route loading, and profile loading.

Profile-load errors keep the approved onboarding image and expose only the real retry action.

Pending-invitation loading stays inline on the Groups page instead of taking over the entire application.

## Anti-AI checks

The implementation intentionally avoids:

- card walls;
- glass/frosted shell panels;
- neon/glow treatment;
- decorative fake progress;
- generic multi-step onboarding;
- invented preference/goal quizzes;
- public-group recommendations;
- reusable invite links;
- fake privacy claims;
- decorative notification controls;
- multiple equal-weight primary actions.
