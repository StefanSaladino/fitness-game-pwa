# Phase 16.0 — Visual inventory + mobile design-system direction

## Status

**DONE — visual direction approved before production implementation.**

Phase 16.0 was re-audited from the Phase 15.8 product baseline after optional/multi-group entry, curated training tips, and preset workouts became real product behavior.

## Approved product-shell direction

- Mobile is the primary composition.
- Primary navigation is stable for every ordinary user: **Home · Lift · Groups · Progress · Compete**.
- Profile/Settings is not a sixth primary destination; it is reached through a persistent account control.
- `cardio` remains a valid secondary feature path but is not promoted into the five-item primary navigation.
- Solo use is a normal steady state. Group membership does not reorder or remove primary destinations.
- Group context is selected inside Groups and Compete rather than through a global header selector.
- Compete may require a group for its real competition content, but that requirement does not gate the rest of the application.
- Invitations are optional and may appear contextually without blocking the personal dashboard.
- Phase 15.8 training tips and preset workouts are real content that later page redesigns may surface; concepts must not fabricate additional coaching or programming behavior.

## Approved visual language

The implementation follows `docs/UI-ANTI-AI-LAYOUT-RULES.md`.

- dark navy/charcoal identity with restrained blue focus/navigation accents and semantic status colors;
- flatter surfaces and fewer generic elevated cards;
- compact page headers and tighter typography hierarchy;
- edge-to-edge mobile navigation rather than a floating glass pill;
- no glassmorphism, neon glows, mesh/aurora gradients, decorative 3D objects, fake gauges, or card walls;
- 44px minimum interactive targets, with primary controls normally 48px or larger;
- safe-area-aware mobile chrome;
- desktop becomes denser without dictating the mobile composition;
- motion is reserved for state/navigation feedback and must respect reduced-motion preferences.

## CSS/component direction

- shell/navigation/page-header presentation moves out of legacy `global.css` as those components are touched;
- shared shell styles remain colocated with `AppShell`, `MobileNav`, `DesktopSidebar`, `ShellHeader`, and `PageHeader`;
- application-wide tokens remain limited to genuinely shared values;
- page-specific redesign remains deferred to its dedicated Phase 16 slice.

## Approval record

The product owner approved the revised mobile visual direction after reviewing the multi-screen mobile concept set and explicitly instructed implementation to proceed. The direction was approved with the project-wide anti-AI layout contract as the governing design reference.

## Exit result

Phase 16.0 establishes the hierarchy and shell architecture. Phase 16.1 may implement the shared shell, but it must not opportunistically redesign Home, workout logging, Groups, Progress, Competition, Cardio, or Settings content.
