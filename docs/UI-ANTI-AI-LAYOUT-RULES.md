# UI Anti-AI Layout Rules

Status: **LOCKED PROJECT-WIDE DESIGN CONTRACT**

These rules apply to Fitness Game UI concepts and implementation. They exist to prevent generic generated-dashboard aesthetics and to keep every screen tied to real product behavior.

## 1. Do not build card walls

Avoid dashboards where every datum becomes an equal rounded rectangle. Do not use:

- symmetrical KPI grids merely because space exists;
- cards nested inside cards;
- empty balancing cards;
- a separate card for every label/value pair;
- oversized corner radii across every surface.

Use sections, rows, tables, lists, and hierarchy when those structures communicate the data more directly.

## 2. Avoid generic AI/SaaS visual shorthand

Do not use decorative patterns that commonly make generated UI feel synthetic:

- glassmorphism or frosted panels;
- mesh, aurora, blue-purple, or neon gradients;
- glow-backed icons, neon borders, or luminous shadows;
- excessive drop shadows;
- decorative 3D objects;
- floating illustrations unrelated to the task;
- sparkles, lightning bolts, shields, mascots, emoji-style feature icons, or abstract blobs merely for decoration;
- radial meters, donut charts, speedometers, or progress rings when text is clearer;
- excessive pill badges or status chips;
- an icon before every heading;
- oversized marketing-style hero sections inside application screens.

A restrained border, surface change, or small purposeful icon is acceptable when it improves function or recognition.

## 3. Never invent product structure in a concept

Generated concepts may show only routes, actions, sections, providers, and states supported by the roadmap or implemented contracts.

Do not invent:

- navigation destinations;
- admin tools;
- Settings subsections that have not been built;
- Users/Content/Analytics/Audit/Export pages merely because an admin console commonly has them;
- feature flags or configuration pages;
- provider-detail actions that do not exist;
- automatic schedules that are not implemented;
- destructive or privileged controls that have not been designed and secured.

Future roadmap items may be mentioned in documentation, but must not be presented as working product UI.

## 4. Never fabricate telemetry or quota data

Do not create sample values and then allow them to look authoritative.

Specifically avoid:

- fake storage/database allowances;
- fake MAU limits;
- fake egress or bandwidth totals;
- fake build credits;
- fake provider connection status;
- fake historical chart points;
- fake refresh/snapshot intervals;
- fake forecasts or dates;
- fake "Healthy" or overall-health summaries.

If a provider feed is unavailable, say **Unavailable**. If no allowance exists, say **Unconfigured**. If no historical snapshots exist, show an honest empty state.

## 5. Do not infer provider billing semantics

Operational metrics and provider billing metrics are separate.

- local Auth recent sign-ins are not Supabase billable MAU;
- database bytes are not the whole Supabase invoice;
- deploy logs are not Netlify authoritative bandwidth;
- build duration is not automatically equivalent to a billing credit total;
- local/provider values must preserve their project/organization/account scope.

Missing provider data never becomes zero.

## 6. No progress visualization without a real denominator

Do not render a progress bar, ring, utilization percentage, warning color, or "remaining" amount unless a trustworthy positive limit exists.

For Phase 15 capacity metrics, Postgres connections may use `max_connections` as an operational ceiling. Other local metrics with no configured allowance remain **Unconfigured**.

## 7. No fake charts

A chart is justified only when enough real historical values exist to communicate change.

- zero snapshots: show an empty state;
- one snapshot: explain that another comparable snapshot is required;
- multiple comparable snapshots: a trend may be shown if it improves understanding.

Do not populate a chart with illustrative history in production UI or implementation screenshots.

## 8. Do not manufacture an overall score

Do not collapse heterogeneous operational signals into an overall "health", "readiness", or "platform score" unless the domain defines that aggregate meaningfully.

When some metrics are unconfigured and provider feeds are unavailable, communicate those states individually.

## 9. Color is supporting information, never the information

Every status must have readable text such as:

- Normal
- Watch
- Warning
- Critical
- Exceeded
- Unconfigured
- Unavailable

Color can reinforce the label but cannot replace it.

## 10. Avoid excessive "live" language

Do not add LIVE dots, pulsing indicators, or real-time badges unless the data actually has a defined live delivery mechanism.

Prefer measured/captured timestamps when they exist.

## 11. Provider branding stays subordinate

Supabase and Netlify are sources, not visual heroes. Provider sections should explain source/scope/availability without becoming giant branded cards.

Do not use provider logos or colors as decoration when plain source labels are clearer.

## 12. Avoid empty sophistication language

Do not create sections titled Overview, Insights, Analytics, Intelligence, Health, or Performance simply to make the interface look advanced.

Every heading should answer a real operational/user question.

## 13. Keep copy compact and task-specific

Avoid:

- slogans;
- promotional filler;
- repeated heading/subheading pairs saying the same thing;
- large paragraphs of documentation inside product screens;
- tiny low-contrast metadata;
- all-caps micro-label overload;
- excessive letter spacing.

Use clear labels and short contextual explanations.

## 14. One clear primary action

Do not present several equal-weight primary buttons.

For Phase 15.2E:

- **Record snapshot** is the primary action;
- **Refresh** is secondary;
- **Back to app** is navigation.

Do not add Export, Configure, View details, or provider settings unless those actions actually exist.

## 15. Mobile is not a shrunken desktop

Mobile concepts must have their own hierarchy:

- vertical scan order;
- touch-sized actions;
- compact navigation;
- no miniature desktop sidebars;
- no wide KPI grid squeezed into two tiny columns merely to preserve desktop composition;
- no horizontal page overflow.

Desktop may become denser, but should preserve the same information priorities.

## 16. Do not fill sidebars with future roadmap destinations

A navigation rail must contain only real destinations available in the current slice.

For the first platform-admin capacity surface, that means:

- Capacity;
- Back to app;
- real admin identity/context only where trustworthy.

Additional admin sections are added only when their phases implement them.

## 17. Avoid redundant navigation

Do not show a full sidebar and a second full top navigation with the same destinations. Mobile and desktop may use different patterns, but each form factor should have one clear navigation system.

## 18. No decorative gauges or visualizations

Do not use charts, radial gauges, maps, progress rings, or decorative bars unless they encode actual information more clearly than text.

## 19. Avoid fake precision

Do not show unnecessary decimals, precise forecast dates, or calculated percentages beyond what the underlying data justifies.

## 20. Do not claim provider success when only the adapter exists

A secure capability adapter does not mean billing telemetry is connected.

If the provider billing feed is unavailable, the UI says **Billing usage unavailable**. It does not say Connected, Healthy, Live, or Synced unless those states are supported by a real provider result.

## 21. No unsupported configuration UI

Do not expose quota editing, provider tokens, billing controls, platform settings, or other configuration actions unless the backend lifecycle, authorization, audit behavior, and roadmap slice exist.

## 22. Asymmetry is allowed

Layouts do not need to be visually balanced by invented content. It is acceptable for one section to be larger or for unused space to remain when that reflects real information priority.

## 23. Avoid excessive floating mobile controls

Do not add giant detached bottom CTAs, overly rounded sheets, floating bubbles, or controls separated from the task they affect merely to look app-like.

## 24. Motion must explain state

Animation is permitted only when it helps communicate navigation, loading, refresh, completion, or state change. Decorative motion is excluded and reduced-motion preferences must be respected.

## 25. Concepts are references, not data contracts

Generated artwork may help decide hierarchy and composition, but implementation must be wired to real services/RPCs and must not copy fabricated values from concept art.

Before implementation, verify each visible item against:

1. the current roadmap;
2. implemented domain/service contracts;
3. actual provider/database availability;
4. accessibility and responsive requirements.

If any concept element cannot pass those checks, remove it from the implementation.