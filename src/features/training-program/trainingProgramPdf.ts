/**
 * Maintainer boundary: printable snapshot of the current persisted plan.
 * Blank write-in fields are intentionally paper-only affordances; handwriting is
 * not structured app state and this PDF must never become execution authority.
 */

import type {
  PDFFont,
  PDFDocument as PDFDocumentType,
  PDFPage,
  RGB,
} from 'pdf-lib';
import type { PersistedTrainingProgram } from './trainingProgramPersistenceService';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 38;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const CONTENT_TOP = 646;
const CONTENT_BOTTOM = 56;

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

interface Palette {
  dark: RGB;
  orange: RGB;
  text: RGB;
  muted: RGB;
  border: RGB;
  light: RGB;
  white: RGB;
}

const GOAL_LABELS = {
  STRENGTH: 'Strength',
  HYPERTROPHY: 'Hypertrophy',
  BALANCED: 'Balanced',
} as const;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const EXECUTION_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  MISSED: 'Missed',
  STARTED_PROGRAMMED: 'Started',
  STARTED_OWN_WORKOUT: 'Own workout started',
  COMPLETED_PROGRAMMED: 'Completed',
  COMPLETED_OWN_WORKOUT: 'Completed with own workout',
};

function safePdfText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u00B7/g, ' x ')
    .replace(/[^\x20-\x7E]/g, '');
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

const SPLIT_LABELS: Record<string, string> = {
  FULL_BODY: 'Full Body',
  FULL_BODY_AB: 'Full Body A / B',
  UPPER_LOWER: 'Upper / Lower',
  FULL_BODY_ABC: 'Full Body A / B / C',
  PUSH_PULL_LEGS: 'Push / Pull / Legs',
  UPPER_LOWER_FULL_BODY: 'Upper / Lower / Full Body',
  UPPER_LOWER_X2: 'Upper / Lower / Upper / Lower',
  PUSH_PULL_UPPER_LOWER: 'Push / Pull / Upper / Lower',
  PPL_UPPER_LOWER: 'Push / Pull / Legs / Upper / Lower',
  UPPER_LOWER_PPL: 'Upper / Lower / Push / Pull / Legs',
  PPL_X2: 'Push / Pull / Legs / Push / Pull / Legs',
  UPPER_LOWER_X3: 'Upper / Lower / Upper / Lower / Upper / Lower',
};

function splitLabel(value: string): string {
  return SPLIT_LABELS[value]
    ?? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fitText(
  font: PDFFont,
  value: string,
  size: number,
  maxWidth: number,
): string {
  const safe = safePdfText(value);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;

  const suffix = '...';
  let fitted = safe;
  while (fitted.length > 0) {
    fitted = fitted.slice(0, -1);
    if (font.widthOfTextAtSize(`${fitted}${suffix}`, size) <= maxWidth) {
      return `${fitted}${suffix}`;
    }
  }

  return suffix;
}

function wrapText(
  font: PDFFont,
  value: string,
  size: number,
  maxWidth: number,
): string[] {
  const words = safePdfText(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function drawHeader(
  page: PDFPage,
  fonts: Fonts,
  palette: Palette,
  program: PersistedTrainingProgram,
  displayName: string,
): void {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 124,
    width: PAGE_WIDTH,
    height: 124,
    color: palette.dark,
  });
  page.drawText('TOP SET', {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 34,
    size: 10,
    font: fonts.bold,
    color: palette.orange,
  });
  page.drawRectangle({
    x: MARGIN_X,
    y: PAGE_HEIGHT - 49,
    width: 42,
    height: 4,
    color: palette.orange,
  });
  page.drawText('Personalized Training Program', {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 82,
    size: 23,
    font: fonts.bold,
    color: palette.white,
  });
  page.drawText(
    safePdfText(
      `${displayName}  |  ${GOAL_LABELS[program.definition.goal]}  |  ${
        program.definition.weeks
      } weeks`,
    ),
    {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 105,
      size: 9,
      font: fonts.regular,
      color: palette.border,
    },
  );
}

function addPage(
  pdf: PDFDocumentType,
  fonts: Fonts,
  palette: Palette,
  program: PersistedTrainingProgram,
  displayName: string,
): PDFPage {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeader(page, fonts, palette, program, displayName);
  return page;
}

export function printableTrainingProgramSetRowCount(
  workingSets: number,
): number {
  if (!Number.isFinite(workingSets)) return 3;
  return Math.min(8, Math.max(3, Math.trunc(workingSets) + 1));
}

function printableExerciseHeight(
  exercise: PersistedTrainingProgram['workouts'][number]['exercises'][number],
): number {
  return 42 + printableTrainingProgramSetRowCount(exercise.workingSets) * 18;
}

function drawWorkoutHeader(
  page: PDFPage,
  fonts: Fonts,
  palette: Palette,
  workout: PersistedTrainingProgram['workouts'][number],
  yTop: number,
  continued = false,
): number {
  page.drawRectangle({
    x: MARGIN_X,
    y: yTop - 48,
    width: CONTENT_WIDTH,
    height: 48,
    color: palette.light,
    borderColor: palette.border,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: MARGIN_X,
    y: yTop - 48,
    width: 4,
    height: 48,
    color: palette.orange,
  });

  page.drawText(
    safePdfText(continued ? `${workout.title} (continued)` : workout.title),
    {
      x: MARGIN_X + 16,
      y: yTop - 19,
      size: 11,
      font: fonts.bold,
      color: palette.text,
    },
  );

  const meta = `${dateLabel(workout.scheduledDate)}  |  ${EXECUTION_LABELS[workout.executionStatus] ?? workout.executionStatus}`;
  page.drawText(safePdfText(meta), {
    x: MARGIN_X + 16,
    y: yTop - 35,
    size: 7.2,
    font: fonts.regular,
    color: palette.muted,
  });

  return yTop - 56;
}

function drawPrintableExercise(
  page: PDFPage,
  fonts: Fonts,
  palette: Palette,
  exercise: PersistedTrainingProgram['workouts'][number]['exercises'][number],
  yTop: number,
): number {
  const rowCount = printableTrainingProgramSetRowCount(exercise.workingSets);
  const height = printableExerciseHeight(exercise);
  const yBottom = yTop - height;

  page.drawRectangle({
    x: MARGIN_X,
    y: yBottom,
    width: CONTENT_WIDTH,
    height,
    color: palette.white,
    borderColor: palette.border,
    borderWidth: 0.8,
  });

  page.drawText(
    fitText(fonts.bold, exercise.canonicalName, 8.5, 248),
    {
      x: MARGIN_X + 12,
      y: yTop - 15,
      size: 8.5,
      font: fonts.bold,
      color: palette.text,
    },
  );

  const prescription = [
    `Plan: ${exercise.workingSets} x ${exercise.repsMin}-${exercise.repsMax}`,
    exercise.targetWeightKg === null
      ? null
      : `${Math.round(exercise.targetWeightKg * 10) / 10} kg`,
    exercise.bodyweightMode === 'ADDED_WEIGHT'
      ? 'added weight'
      : exercise.bodyweightMode === 'ASSISTED'
        ? 'assisted'
        : null,
  ].filter(Boolean).join('  |  ');

  page.drawText(fitText(fonts.regular, prescription, 7, 210), {
    x: MARGIN_X + 12,
    y: yTop - 28,
    size: 7,
    font: fonts.regular,
    color: palette.muted,
  });

  page.drawText('Actual sets: ______', {
    x: PAGE_WIDTH - MARGIN_X - 108,
    y: yTop - 28,
    size: 7,
    font: fonts.regular,
    color: palette.muted,
  });

  const rowStartY = yTop - 47;
  for (let setIndex = 0; setIndex < rowCount; setIndex += 1) {
    const rowY = rowStartY - setIndex * 18;
    page.drawText(`Set ${setIndex + 1}`, {
      x: MARGIN_X + 14,
      y: rowY,
      size: 7,
      font: fonts.bold,
      color: palette.text,
    });
    page.drawText('Weight / load', {
      x: MARGIN_X + 63,
      y: rowY,
      size: 6.4,
      font: fonts.regular,
      color: palette.muted,
    });
    page.drawLine({
      start: { x: MARGIN_X + 128, y: rowY - 1 },
      end: { x: MARGIN_X + 242, y: rowY - 1 },
      thickness: 0.6,
      color: palette.muted,
    });
    page.drawText('Reps', {
      x: MARGIN_X + 263,
      y: rowY,
      size: 6.4,
      font: fonts.regular,
      color: palette.muted,
    });
    page.drawLine({
      start: { x: MARGIN_X + 294, y: rowY - 1 },
      end: { x: MARGIN_X + 365, y: rowY - 1 },
      thickness: 0.6,
      color: palette.muted,
    });
    page.drawText('Done', {
      x: PAGE_WIDTH - MARGIN_X - 66,
      y: rowY,
      size: 6.4,
      font: fonts.regular,
      color: palette.muted,
    });
    page.drawRectangle({
      x: PAGE_WIDTH - MARGIN_X - 23,
      y: rowY - 2,
      width: 8,
      height: 8,
      borderColor: palette.muted,
      borderWidth: 0.7,
    });
  }

  return yBottom;
}

export function trainingProgramPdfFileName(
  program: PersistedTrainingProgram,
): string {
  return `top-set-program-${program.definition.source.startDate}.pdf`;
}

export async function generateTrainingProgramPdf(
  program: PersistedTrainingProgram,
  displayName: string,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Top Set Personalized Training Program - ${displayName}`);
  pdf.setAuthor('Top Set');
  pdf.setSubject('Personalized training program export');
  pdf.setProducer('Top Set training-program-v1');

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const palette: Palette = {
    dark: rgb(18 / 255, 19 / 255, 22 / 255),
    orange: rgb(241 / 255, 90 / 255, 8 / 255),
    text: rgb(28 / 255, 29 / 255, 33 / 255),
    muted: rgb(101 / 255, 106 / 255, 114 / 255),
    border: rgb(220 / 255, 223 / 255, 228 / 255),
    light: rgb(245 / 255, 246 / 255, 248 / 255),
    white: rgb(1, 1, 1),
  };

  let page = addPage(pdf, fonts, palette, program, displayName);
  let y = CONTENT_TOP;

  page.drawText('PROGRAM BRIEF', {
    x: MARGIN_X,
    y,
    size: 8,
    font: fonts.bold,
    color: palette.orange,
  });
  y -= 22;

  const title = `${GOAL_LABELS[program.definition.goal]} | ${
    program.definition.sessionsPerWeek
  } sessions/week | ${splitLabel(program.definition.source.resolvedSplit)}`;

  for (const line of wrapText(fonts.bold, title, 16, CONTENT_WIDTH)) {
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: 16,
      font: fonts.bold,
      color: palette.text,
    });
    y -= 20;
  }

  y -= 4;
  const lastDate = program.workouts.at(-1)?.scheduledDate
    ?? program.definition.source.startDate;
  page.drawText(
    safePdfText(
      `${dateLabel(program.definition.source.startDate)} - ${
        dateLabel(lastDate)
      }  |  ${STATUS_LABELS[program.status] ?? program.status}`,
    ),
    {
      x: MARGIN_X,
      y,
      size: 9,
      font: fonts.regular,
      color: palette.muted,
    },
  );
  y -= 22;

  page.drawRectangle({
    x: MARGIN_X,
    y: y - 58,
    width: CONTENT_WIDTH,
    height: 58,
    color: palette.light,
  });
  page.drawText('PRINTABLE WORKOUT LOG', {
    x: MARGIN_X + 14,
    y: y - 20,
    size: 7.5,
    font: fonts.bold,
    color: palette.orange,
  });
  const authorityLines = wrapText(
    fonts.regular,
    'Print this program and use the blank rows to record actual sets, weight/load, and reps. The in-app program remains authoritative for substitutions, adaptations, execution status, and completed history.',
    7.4,
    CONTENT_WIDTH - 28,
  );
  let authorityY = y - 37;
  for (const line of authorityLines.slice(0, 2)) {
    page.drawText(line, {
      x: MARGIN_X + 14,
      y: authorityY,
      size: 7.4,
      font: fonts.regular,
      color: palette.muted,
    });
    authorityY -= 10;
  }
  y -= 82;

  let activeWeek = -1;
  for (const workout of program.workouts) {
    if (workout.weekIndex !== activeWeek) {
      if (y - 72 < CONTENT_BOTTOM) {
        page = addPage(pdf, fonts, palette, program, displayName);
        y = CONTENT_TOP;
      }
      activeWeek = workout.weekIndex;
      page.drawText(`WEEK ${activeWeek + 1}`, {
        x: MARGIN_X,
        y,
        size: 9,
        font: fonts.bold,
        color: palette.orange,
      });
      y -= 18;
    }

    if (y - 56 < CONTENT_BOTTOM) {
      page = addPage(pdf, fonts, palette, program, displayName);
      y = CONTENT_TOP;
    }
    y = drawWorkoutHeader(page, fonts, palette, workout, y);

    for (const exercise of workout.exercises) {
      const exerciseHeight = printableExerciseHeight(exercise);
      if (y - exerciseHeight < CONTENT_BOTTOM) {
        page = addPage(pdf, fonts, palette, program, displayName);
        y = CONTENT_TOP;
        y = drawWorkoutHeader(page, fonts, palette, workout, y, true);
      }
      y = drawPrintableExercise(page, fonts, palette, exercise, y) - 7;
    }

    y -= 9;
  }

  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    current.drawLine({
      start: { x: MARGIN_X, y: 43 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: 43 },
      thickness: 0.6,
      color: palette.border,
    });
    current.drawText(
      safePdfText(`training-program-v1  |  revision ${program.revision}`),
      {
        x: MARGIN_X,
        y: 26,
        size: 7,
        font: fonts.regular,
        color: palette.muted,
      },
    );
    const pageLabel = `Page ${index + 1} of ${pages.length}`;
    const width = fonts.regular.widthOfTextAtSize(pageLabel, 7);
    current.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN_X - width,
      y: 26,
      size: 7,
      font: fonts.regular,
      color: palette.muted,
    });
  });

  return pdf.save();
}

export async function downloadTrainingProgramPdf(
  program: PersistedTrainingProgram,
  displayName: string,
): Promise<void> {
  const bytes = await generateTrainingProgramPdf(program, displayName);
  const buffer = bytes.slice().buffer as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = trainingProgramPdfFileName(program);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
