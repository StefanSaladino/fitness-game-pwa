# Phase 5.2 UI foundation hotfix

Fixes:
- `CardProps.title` collision with the native `HTMLAttributes<HTMLElement>.title` string attribute.
- `TextField` label semantics so hint/error text describes the input without becoming part of its accessible name.
- `SelectField` receives the same corrected field-label structure proactively.

Copy the `src` folder over the project root, then rerun typecheck, tests, build, structural validation, and Playwright.
