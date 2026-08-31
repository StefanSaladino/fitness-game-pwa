import {
  LIFTING_BADGE_KEYS,
  liftingBadgeDefinition,
  type LiftingBadgeCategory,
  type LiftingBadgeKey,
} from '../consistency';

export interface BadgePalette {
  rim: string;
  rimHighlight: string;
  face: string;
  faceDeep: string;
  accent: string;
  text: string;
}

export interface BadgePresentationDefinition {
  key: LiftingBadgeKey;
  title: string;
  description: string;
  category: LiftingBadgeCategory;
  sortOrder: number;
  palette: BadgePalette;
}

const PALETTES: Readonly<Record<LiftingBadgeKey, BadgePalette>> = Object.freeze({
  FIRST_PR: { rim: '#b8743c', rimHighlight: '#f1b77c', face: '#5b2819', faceDeep: '#24110d', accent: '#ffd0a3', text: '#fff7ef' },
  PR_5: { rim: '#9aa8b9', rimHighlight: '#e9f0f7', face: '#263849', faceDeep: '#101820', accent: '#d9edff', text: '#f6fbff' },
  PR_10: { rim: '#d8ad45', rimHighlight: '#ffe59a', face: '#624812', faceDeep: '#241b08', accent: '#fff0ac', text: '#fffaf0' },
  PR_25: { rim: '#d8d5e8', rimHighlight: '#ffffff', face: '#443d62', faceDeep: '#191625', accent: '#f1ecff', text: '#ffffff' },
  LIFT_DAYS_5: { rim: '#5f8fa8', rimHighlight: '#9ed8ef', face: '#153d50', faceDeep: '#091d27', accent: '#b9ecff', text: '#f4fcff' },
  LIFT_DAYS_10: { rim: '#6479b8', rimHighlight: '#aebcff', face: '#253567', faceDeep: '#10172f', accent: '#ccd5ff', text: '#f7f8ff' },
  LIFT_DAYS_25: { rim: '#795fa9', rimHighlight: '#c5b1ef', face: '#38255c', faceDeep: '#171024', accent: '#decfff', text: '#fbf8ff' },
  LIFT_DAYS_50: { rim: '#51475f', rimHighlight: '#bfb3ca', face: '#211b2a', faceDeep: '#0b0910', accent: '#e2d9e9', text: '#ffffff' },
  GOAL_WEEK_1: { rim: '#4f9a6b', rimHighlight: '#9ee2b5', face: '#185331', faceDeep: '#0a2517', accent: '#bdf6cf', text: '#f5fff8' },
  GOAL_STREAK_2: { rim: '#389c8d', rimHighlight: '#83e2d2', face: '#12564c', faceDeep: '#082722', accent: '#aaf4e7', text: '#f2fffd' },
  GOAL_STREAK_4: { rim: '#b78d2d', rimHighlight: '#f3cf73', face: '#5c4210', faceDeep: '#231a07', accent: '#ffe49a', text: '#fffaf0' },
  GOAL_STREAK_8: { rim: '#c76a3a', rimHighlight: '#ffb37f', face: '#682c19', faceDeep: '#281008', accent: '#ffd0ad', text: '#fff7f2' },
  CARDIO_BONUS_DAYS_5: { rim: '#3c9eb6', rimHighlight: '#8ee8f4', face: '#0f5261', faceDeep: '#07262d', accent: '#adf2fb', text: '#f2fdff' },
  CARDIO_BONUS_DAYS_10: { rim: '#b84b66', rimHighlight: '#f69ab0', face: '#651d33', faceDeep: '#270b14', accent: '#ffc0cf', text: '#fff5f8' },
});

export const BADGE_CATALOG: readonly BadgePresentationDefinition[] = Object.freeze(
  LIFTING_BADGE_KEYS.map((key, sortOrder) => {
    const definition = liftingBadgeDefinition(key);
    return Object.freeze({
      ...definition,
      sortOrder,
      palette: PALETTES[key],
    });
  }),
);

const CATALOG_BY_KEY = new Map(BADGE_CATALOG.map((definition) => [definition.key, definition]));

export function badgePresentationDefinition(key: LiftingBadgeKey): BadgePresentationDefinition {
  const definition = CATALOG_BY_KEY.get(key);
  if (!definition) throw new Error(`Missing badge presentation for ${key}.`);
  return definition;
}
