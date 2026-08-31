import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import badgeEmblem from '../assets/top-set-badge-emblem.svg';
import type { BadgePresentationDefinition } from '../badgeCatalog';
import styles from './BadgeCoin.module.css';

interface BadgeCoinProps {
  definition: BadgePresentationDefinition;
  earnedAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const DRAG_THRESHOLD_PX = 6;
const ROTATION_PER_PIXEL = 0.72;

function normalizeRotation(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function snapRotation(value: number): number {
  return Math.round(value / 180) * 180;
}

function formattedEarnedDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function BadgeCoin({ definition, earnedAt = null, size = 'md' }: BadgeCoinProps) {
  const [rotation, setRotation] = useState(0);
  const pointerId = useRef<number | null>(null);
  const pointerStartX = useRef(0);
  const pointerStartRotation = useRef(0);
  const dragged = useRef(false);
  const suppressClick = useRef(false);
  const earned = Boolean(earnedAt);
  const normalized = normalizeRotation(rotation);
  const backVisible = normalized >= 90 && normalized < 270;

  const paletteStyle = {
    '--badge-rim': definition.palette.rim,
    '--badge-rim-highlight': definition.palette.rimHighlight,
    '--badge-face': definition.palette.face,
    '--badge-face-deep': definition.palette.faceDeep,
    '--badge-accent': definition.palette.accent,
    '--badge-text': definition.palette.text,
  } as CSSProperties;

  const rotateHalfTurn = () => setRotation((current) => snapRotation(current) + 180);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    pointerId.current = event.pointerId;
    pointerStartX.current = event.clientX;
    pointerStartRotation.current = rotation;
    dragged.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId) return;
    const delta = event.clientX - pointerStartX.current;
    if (Math.abs(delta) >= DRAG_THRESHOLD_PX) dragged.current = true;
    if (!dragged.current) return;
    setRotation(pointerStartRotation.current + delta * ROTATION_PER_PIXEL);
  };

  const finishPointerInteraction = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId) return;
    if (dragged.current) {
      suppressClick.current = true;
      setRotation((current) => snapRotation(current));
      window.setTimeout(() => { suppressClick.current = false; }, 0);
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    pointerId.current = null;
  };

  return (
    <button
      aria-label={`${definition.title} badge, ${earned ? 'earned' : 'locked'}. Rotate badge.`}
      aria-pressed={backVisible}
      className={`${styles.coinButton} ${styles[size]} ${earned ? styles.earned : styles.locked}`}
      data-badge-key={definition.key}
      data-badge-state={earned ? 'earned' : 'locked'}
      data-badge-emblem="top-set"
      data-rotation={Math.round(rotation)}
      onClick={() => {
        if (suppressClick.current) return;
        rotateHalfTurn();
      }}
      onPointerCancel={(event) => {
        if (pointerId.current === event.pointerId) setRotation((current) => snapRotation(current));
        pointerId.current = null;
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointerInteraction}
      style={paletteStyle}
      type="button"
    >
      <span className={styles.scene} aria-hidden="true">
        <span className={styles.coin} style={{ transform: `rotateY(${rotation}deg)` }}>
          <span className={`${styles.face} ${styles.front}`}>
            <span className={styles.rim} />
            <span className={styles.innerRing} />
            <span
              className={styles.emblem}
              style={{ WebkitMaskImage: `url(${badgeEmblem})`, maskImage: `url(${badgeEmblem})` }}
            />
            <span className={styles.frontLabel}>TOP SET</span>
          </span>

          <span className={`${styles.face} ${styles.back}`}>
            <span className={styles.rim} />
            <span className={styles.innerRing} />
            <span className={styles.status}>{earned ? 'EARNED' : 'LOCKED'} · {definition.category}</span>
            <strong>{definition.title}</strong>
            <span className={styles.description}>{definition.description}</span>
            <span className={styles.date}>{earnedAt ? `Earned ${formattedEarnedDate(earnedAt)}` : 'Rotate to inspect'}</span>
          </span>
        </span>
      </span>
      <span className={styles.accessibleText}>
        {definition.title}. {definition.description} {earnedAt ? `Earned ${formattedEarnedDate(earnedAt)}.` : 'Locked.'}
      </span>
    </button>
  );
}
