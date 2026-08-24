# Phase 16.3 — Proposal-match visual audit

This document records the final reconciliation between the approved Phase 16.3 concept image and the implemented surfaces.

## Grounding rule

Visual matching does not override product truth.

Two elements from the concept are deliberately not fabricated:

1. the iPhone status bar / device chrome — supplied by the operating system/browser, never rendered by the product;
2. the notification bell — no notification-center action exists in the current product contract, so the real Profile/Settings action occupies the same top-right visual footprint instead.

All persisted fields and actions remain the existing codebase contract.

## Shared visual system

| Detail | Final implementation |
|---|---|
| Page background | near-black `#070709` |
| Surface | `#0e0f11` / `#121316` |
| Primary text | `#f7f7f7` |
| Muted text | neutral gray, not blue-gray |
| Interaction accent | warm red-orange `#f15a08` |
| Primary radius | 7–8px |
| Card radius | 12px |
| Shadows | removed from Phase 16.3 task surfaces |
| General gradients | none |
| Font stack | native system UI / SF Pro on Apple devices; Segoe UI fallback on Windows |
| Heading weight | semibold rather than heavy-bold |
| Body weight | regular |
| Bottom-nav active state | orange icon + label |

The prior navy/blue/cyan visual language is not used for these surfaces.

## Profile setup

The mobile composition follows the approved first phone:

- full-width 16:9 gym photograph;
- content begins directly below the photograph;
- no floating card;
- 20px mobile horizontal content padding;
- compact semibold title;
- regular muted support copy;
- 46px dark text/select controls;
- 8px field radius;
- small labels and helper copy;
- seven compact weekly-target buttons;
- selected target uses the same orange as the CTA;
- 48px full-width Complete setup action.

The image crop uses the supplied bench/dumbbell/water-bottle photograph.

Persisted values remain visible. The implementation does not artificially empty a pre-existing display name/timezone merely because the static concept image showed placeholders.

## Groups — zero memberships

The mobile composition follows the approved second phone:

- centered `Groups` top title;
- real Settings action at the top right;
- neutral-gray group icon with no decorative tile;
- centered `Groups are optional.` title;
- short grounded solo/group explanation;
- one charcoal Create your group card;
- compact Group name field;
- full-width orange Create group action;
- line / `or` / line divider;
- full-width outlined Go to Home action;
- edge-to-edge bottom navigation;
- orange Groups destination.

Copy remains grounded: personal training works without a group; shared competition requires group context.

## Groups — targeted invitation

The mobile composition follows the approved third phone:

- Pending invitations heading;
- invitation support copy;
- one dark invitation card;
- derived two-letter group initials in a muted-violet circle;
- real group name;
- real inviter display name;
- real inviter username;
- equal Decline and Accept actions;
- orange Accept action;
- divider;
- No thanks heading;
- Groups are optional support copy;
- full-width outlined Go to Home action.

No Create group form is duplicated under a pending invitation.

## Loading

The generic loading scaffold is replaced with:

- near-black viewport;
- centered orange Top Set mark;
- compact TOP SET wordmark;
- 2px indeterminate orange progress line;
- small neutral-gray contextual loading text;
- no card;
- no percentage;
- no fake progress steps;
- reduced-motion fallback.
