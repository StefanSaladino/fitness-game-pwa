# SelectField native menu contrast hotfix

Apply over the current project tree.

This fixes native select menus on Windows/Chromium where the popup could render a white background while inheriting white app text.

Changes:
- Adds `SelectField.module.css`.
- Applies `color-scheme: dark` to the reusable SelectField.
- Gives native `option`/`optgroup` entries explicit app text/background colors.
- Does not modify global.css or onboarding-specific styles.

After applying, run:

npm run typecheck
npm test
npm run build
