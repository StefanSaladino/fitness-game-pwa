import { describe, expect, it } from 'vitest';
import { CURRENT_TUTORIAL_VERSION, tutorialIsRequired } from './model';

describe('tutorial model', () => {
  it('requires the current tutorial until its version has been completed', () => {
    expect(tutorialIsRequired({ tutorialCompletedVersion: 0 })).toBe(true);
    expect(
      tutorialIsRequired({
        tutorialCompletedVersion: CURRENT_TUTORIAL_VERSION,
      }),
    ).toBe(false);
  });

  it('treats legacy profiles without the field as not yet completed', () => {
    expect(tutorialIsRequired({})).toBe(true);
  });
});
