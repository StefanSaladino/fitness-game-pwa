import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { TopSetMark } from '../../../components/brand/TopSetMark';
import { Button } from '../../../components/ui';
import { replacePath } from '../../../lib/appNavigation';
import type { OnboardingProfile } from '../../onboarding';
import {
  CURRENT_TUTORIAL_VERSION,
  type TutorialDestination,
} from '../model';
import {
  createTutorialService,
  type TutorialService,
} from '../tutorialService';
import styles from './TutorialCoach.module.css';

interface TutorialCoachProps {
  profile: OnboardingProfile;
  required: boolean;
  returnPath?: string;
  service?: TutorialService;
  onProfileChanged(): Promise<unknown> | unknown;
}

interface TutorialStep {
  selector: string;
  eyebrow: string;
  title: string;
  body: string;
  detail: string;
}

const STEPS: readonly TutorialStep[] = [
  {
    selector: 'section[aria-labelledby="weekly-progress-heading"]',
    eyebrow: 'HOME',
    title: 'This is your training week.',
    body: 'Home is the quick read: weekly lifting target, XP, recent lifts, PRs, consistency, and group rank when you use a crew.',
    detail: 'The tutorial uses sample data only. Your real account information is never rendered inside the walkthrough.',
  },
  {
    selector: '[data-lift-start] [data-app-media-banner]',
    eyebrow: 'LIFT',
    title: 'Every workout starts here.',
    body: 'Start empty, use a preset as a head start, or launch a workout from your personalized Program.',
    detail: 'No matter how you start, the normal Lift workflow remains the source of truth for sets, reps, weight, timing, and completion.',
  },
  {
    selector: '[data-training-program-page]',
    eyebrow: 'PROGRAM',
    title: 'Plan around your real setup.',
    body: 'Programs use your goal, schedule, equipment, training history, exercise preferences, and confirmed exclusions.',
    detail: 'Injury and limitation suggestions are exercises to review. Nothing becomes excluded until you confirm it.',
  },
  {
    selector: '[data-progress-surface="volume-targets-entry"], [data-progress-page]',
    eyebrow: 'PROGRESS',
    title: 'Turn completed workouts into context.',
    body: 'Track exercise progress, PR history, lifting frequency, Training Volume, personalized volume guidance, and completed reports.',
    detail: 'As your completed history grows, Top Set has more evidence to work with.',
  },
  {
    selector: '[data-groups-setup] [data-app-media-banner], [data-groups-setup]',
    eyebrow: 'GROUPS',
    title: 'Train solo or build a crew.',
    body: 'Groups are optional. Create one, accept an invite, or ignore the social layer entirely and keep your personal training intact.',
    detail: 'Group membership never replaces your personal workout history.',
  },
  {
    selector: '[data-global-all-time-composition] [data-app-media-banner], [data-global-all-time-composition]',
    eyebrow: 'COMPETE',
    title: 'Competition is an extra layer.',
    body: 'See crew standings, global XP, badges, and privacy-safe activity highlights without exposing full workout details.',
    detail: 'Reactions and social activity do not change authoritative workout scoring.',
  },
  {
    selector: 'button[aria-label="Help & tutorial"], [data-settings-view="index"]',
    eyebrow: 'SETTINGS',
    title: 'You can replay this anytime.',
    body: 'Training preferences, notifications, privacy, app status, account controls, and this tutorial all live in Settings.',
    detail: 'Use Help & tutorial whenever you want another guided pass through the app.',
  },
] as const;

function clampStep(value: number): number {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(STEPS.length - 1, value));
}

function readStepIndex(): number {
  if (typeof window === 'undefined') return 0;
  const value = Number(
    new URLSearchParams(window.location.search).get('step') ?? '0',
  );
  return clampStep(value);
}

function tutorialPath(stepIndex: number, returnPath: string): string {
  const params = new URLSearchParams();
  params.set('step', String(clampStep(stepIndex)));
  if (returnPath === '/settings') params.set('from', 'settings');
  return `/tutorial?${params.toString()}`;
}

function boundedRect(rect: DOMRect) {
  const margin = 10;
  const top = Math.max(margin, rect.top - margin);
  const left = Math.max(margin, rect.left - margin);
  const right = Math.min(window.innerWidth - margin, rect.right + margin);
  const bottom = Math.min(window.innerHeight - margin, rect.bottom + margin);

  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function TutorialCoach({
  profile: _profile,
  required,
  returnPath = '/',
  service: injectedService,
  onProfileChanged,
}: TutorialCoachProps) {
  const serviceRef = useRef<TutorialService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = injectedService ?? createTutorialService();
  }

  const [stepIndex, setStepIndex] = useState(readStepIndex);
  const [targetRect, setTargetRect] = useState<ReturnType<typeof boundedRect> | null>(null);
  const [targetReady, setTargetReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (cancelled) return;
      const element = document.querySelector<HTMLElement>(step.selector);
      if (!element) {
        setTargetReady(false);
        setTargetRect(null);
        return;
      }

      const next = boundedRect(element.getBoundingClientRect());
      setTargetReady(next.width > 0 && next.height > 0);
      setTargetRect(next);
    };

    const position = () => {
      const element = document.querySelector<HTMLElement>(step.selector);
      if (!element) {
        sync();
        return;
      }

      element.scrollIntoView({
        behavior: 'auto',
        block: window.innerWidth < 700 ? 'start' : 'center',
        inline: 'nearest',
      });

      window.setTimeout(sync, 50);
    };

    const observer = new MutationObserver(position);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const timer = window.setTimeout(position, 60);
    const retry = window.setInterval(position, 300);
    const stopRetry = window.setTimeout(
      () => window.clearInterval(retry),
      3000,
    );

    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(stopRetry);
      window.clearInterval(retry);
      observer.disconnect();
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [step.selector]);

  const spotlightStyle = useMemo<CSSProperties | undefined>(() => {
    if (!targetRect) return undefined;
    return {
      top: targetRect.top,
      left: targetRect.left,
      width: targetRect.width,
      height: targetRect.height,
    };
  }, [targetRect]);

  const navigateStep = (nextIndex: number) => {
    const resolved = clampStep(nextIndex);
    setStepIndex(resolved);
    setTargetRect(null);
    setTargetReady(false);
    replacePath(tutorialPath(resolved, returnPath));
  };

  const finish = async (destination: TutorialDestination | string) => {
    setBusy(true);
    setError('');

    try {
      if (required) {
        await serviceRef.current!.complete(CURRENT_TUTORIAL_VERSION);
        await onProfileChanged();
      }
      replacePath(destination);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Tutorial progress could not be saved.',
      );
      setBusy(false);
    }
  };

  const topAction = () => {
    if (isLast) {
      void finish('/');
      return;
    }
    void finish(returnPath === '/settings' ? '/settings' : '/');
  };

  return (
    <div className={styles.root} data-tutorial-coach>
      <div className={styles.interactionShield} aria-hidden="true" />

      <div
        aria-hidden="true"
        className={`${styles.spotlight}${targetReady ? ` ${styles.spotlightReady}` : ''}`}
        style={spotlightStyle}
      />

      <section
        aria-describedby="tutorial-coach-body"
        aria-labelledby="tutorial-coach-title"
        aria-modal="true"
        className={styles.coach}
        role="dialog"
      >
        <div className={styles.coachTopline}>
          <div className={styles.brand}>
            <TopSetMark size={18} />
            <span>TOP SET TOUR</span>
          </div>
          <button
            className={styles.skip}
            disabled={busy}
            onClick={topAction}
            type="button"
          >
            {isLast
              ? 'Go to Home page'
              : required
                ? 'Skip tutorial'
                : 'Close'}
          </button>
        </div>

        <div className={styles.progressRow}>
          <span>{stepIndex + 1} of {STEPS.length}</span>
          <div className={styles.stepDots} aria-label="Tutorial steps">
            {STEPS.map((item, index) => (
              <button
                aria-label={`Go to tutorial step ${index + 1}: ${item.eyebrow}`}
                aria-current={index === stepIndex ? 'step' : undefined}
                disabled={busy}
                key={item.eyebrow}
                onClick={() => navigateStep(index)}
                type="button"
              />
            ))}
          </div>
        </div>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>{step.eyebrow}</p>
          <h2 id="tutorial-coach-title" ref={headingRef} tabIndex={-1}>
            {step.title}
          </h2>
          <p className={styles.body} id="tutorial-coach-body">
            {step.body}
          </p>
          <p className={styles.detail}>{step.detail}</p>
        </div>

        {!targetReady ? (
          <p className={styles.loading} role="status">
            Loading this screen…
          </p>
        ) : null}

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.actions}>
          <Button
            disabled={busy || stepIndex === 0}
            onClick={() => navigateStep(stepIndex - 1)}
            variant="ghost"
          >
            Back
          </Button>

          {!isLast ? (
            <Button
              disabled={busy}
              onClick={() => navigateStep(stepIndex + 1)}
            >
              Next screen
            </Button>
          ) : (
            <div className={styles.finishActions}>
              <Button
                disabled={busy}
                onClick={() => void finish('/lift')}
              >
                {busy ? 'Saving…' : 'Start a lift'}
              </Button>
              <Button
                disabled={busy}
                onClick={() => void finish('/program')}
                variant="secondary"
              >
                Set up Program
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
