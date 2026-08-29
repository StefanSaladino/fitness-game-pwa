import { createWorkoutMutationQueueItem } from '../../src/features/workout/mutations/workoutMutationModel';
import { createWorkoutMutationStorage } from '../../src/features/workout/mutations/workoutMutationStorage';
import type { ActiveWorkoutRecoverySnapshot } from '../../src/features/workout/recovery/workoutRecoveryModel';
import { createWorkoutRecoveryStorage } from '../../src/features/workout/recovery/workoutRecoveryStorage';

const USER_ID = 'indexeddb-e2e-user';
const currentRecoveryKey = `fitness-game:active-workout:v2:${USER_ID}`;
const currentQueueKey = `fitness-game:workout-mutations:v2:${USER_ID}`;
const staleRecoveryKey = `fitness-game:active-workout:v1:${USER_ID}`;
const staleQueueKey = `fitness-game:workout-mutations:v1:${USER_ID}`;

const snapshot: ActiveWorkoutRecoverySnapshot = {
  version: 1,
  userId: USER_ID,
  savedAtMs: 100,
  session: {
    id: 'indexeddb-workout-1',
    userId: USER_ID,
    startedAt: '2026-08-21T18:00:00.000Z',
    activeDurationSeconds: 600,
    timezoneAtStart: 'America/Toronto',
    scoringDate: '2026-08-21',
    pausedAt: null,
    lastResumedAt: '2026-08-21T18:00:00.000Z',
  },
  exercises: [],
  sets: [],
  ui: { weightUnit: 'KG', setDrafts: {} },
};

const queueItem = createWorkoutMutationQueueItem(
  USER_ID,
  snapshot.session.id,
  { kind: 'ADD_SET', payload: { workoutExerciseId: 'we-1', setType: 'WORKING' } },
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  101,
);

const recoveryStorage = createWorkoutRecoveryStorage();
const mutationStorage = createWorkoutMutationStorage();

function setText(id: string, value: string) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

async function renderState() {
  const recovery = await recoveryStorage.load(USER_ID);
  const queue = await mutationStorage.load(USER_ID);
  setText('recovery', `Recovery: ${recovery?.session.id ?? 'empty'}`);
  setText('queue', `Queue: ${queue.map((item) => item.kind).join(',') || 'empty'}`);
  setText('legacy', `Current fallback keys: ${localStorage.getItem(currentRecoveryKey) || localStorage.getItem(currentQueueKey) ? 'present' : 'cleared'}`);
  setText('stale', `Stale v1 keys: ${localStorage.getItem(staleRecoveryKey) || localStorage.getItem(staleQueueKey) ? 'present' : 'cleared'}`);
}

document.getElementById('seed')?.addEventListener('click', async () => {
  localStorage.setItem(currentRecoveryKey, JSON.stringify(snapshot));
  localStorage.setItem(currentQueueKey, JSON.stringify([queueItem]));
  await recoveryStorage.load(USER_ID);
  await mutationStorage.load(USER_ID);
  await renderState();
});

document.getElementById('seed-stale')?.addEventListener('click', async () => {
  await recoveryStorage.clear(USER_ID);
  await mutationStorage.clear(USER_ID);
  localStorage.setItem(staleRecoveryKey, JSON.stringify(snapshot));
  localStorage.setItem(staleQueueKey, JSON.stringify([queueItem]));
  await renderState();
});

document.getElementById('clear')?.addEventListener('click', async () => {
  await recoveryStorage.clear(USER_ID);
  await mutationStorage.clear(USER_ID);
  await renderState();
});

void renderState();
