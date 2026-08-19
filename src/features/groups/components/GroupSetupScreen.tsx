import { useState } from 'react';
import type { CreateGroupInput } from '../model';
import { CreateGroupForm } from './CreateGroupForm';
import { JoinGroupForm } from './JoinGroupForm';
import styles from './GroupSetup.module.css';

type SetupMode = 'create' | 'join';

interface GroupSetupScreenProps {
  creating?: boolean;
  joining?: boolean;
  createError?: string;
  joinError?: string;
  onCreate(input: CreateGroupInput): Promise<unknown> | unknown;
  onJoin(inviteToken: string): Promise<unknown> | unknown;
}

const principles = [
  ['01', 'Lift independently'],
  ['02', 'Compete on earned XP'],
  ['03', 'Progress together'],
] as const;

export function GroupSetupScreen({
  creating = false,
  joining = false,
  createError = '',
  joinError = '',
  onCreate,
  onJoin,
}: GroupSetupScreenProps) {
  const [mode, setMode] = useState<SetupMode>('create');

  return (
    <main className={styles.shell}>
      <section className={styles.hero} aria-labelledby="group-setup-title">
        <div className={styles.brandLine}>
          <span className={styles.brandMark} aria-hidden="true">L</span>
          <span>LIFTING-V1</span>
        </div>

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>YOUR TRAINING CIRCLE</p>
          <h1 id="group-setup-title">Build the crew you want to get stronger with.</h1>
          <p className={styles.lead}>
            Your workouts and progression remain yours. Groups add accountability, rankings, and shared momentum.
          </p>
        </div>

        <ol className={styles.principles} aria-label="How groups work">
          {principles.map(([number, label]) => (
            <li key={number}>
              <span>{number}</span>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.panel} aria-label="Group setup">
        <div className={styles.modeSwitch} role="group" aria-label="Choose group setup mode">
          <button
            aria-pressed={mode === 'create'}
            className={mode === 'create' ? styles.modeButtonActive : styles.modeButton}
            disabled={creating || joining}
            onClick={() => setMode('create')}
            type="button"
          >
            Create
          </button>
          <button
            aria-pressed={mode === 'join'}
            className={mode === 'join' ? styles.modeButtonActive : styles.modeButton}
            disabled={creating || joining}
            onClick={() => setMode('join')}
            type="button"
          >
            Join
          </button>
        </div>

        <div className={styles.formStage} >
          {mode === 'create' ? (
            <CreateGroupForm busy={creating} error={createError} onSubmit={onCreate} />
          ) : (
            <JoinGroupForm busy={joining} error={joinError} onSubmit={onJoin} />
          )}
        </div>

        <p className={styles.privacyNote}>
          Group membership never changes how your personal lifting progression is calculated.
        </p>
      </section>
    </main>
  );
}
