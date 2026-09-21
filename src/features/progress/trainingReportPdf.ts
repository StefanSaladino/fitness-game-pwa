import type {
  PDFFont,
  PDFDocument as PDFDocumentType,
  PDFPage,
  RGB,
} from 'pdf-lib';
import type {
  CompletedTrainingReport,
  TrainingReportMuscleResult,
} from './trainingReportModel';
import type { VolumeRecommendationAction } from './volumeRecommendationEngine';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const HEADER_HEIGHT = 118;
const CONTENT_TOP = PAGE_HEIGHT - HEADER_HEIGHT - 32;
const CONTENT_BOTTOM = 54;
const FOOTER_Y = 28;

const ACTIONABLE = new Set<VolumeRecommendationAction>([
  'ADD_VOLUME_CAUTIOUSLY',
  'HOLD_AND_REVIEW',
  'REDUCE_VOLUME_CAUTIOUSLY',
]);

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
  FOREARMS_GRIP: 'Forearms & grip',
  CORE: 'Core',
  OBLIQUES: 'Obliques',
  NECK: 'Neck',
};

const TREND_LABELS: Record<string, string> = {
  IMPROVING: 'Improving',
  DECLINING: 'Declining',
  STABLE: 'Stable',
  PLATEAU: 'Plateau',
  VARIABLE: 'Variable',
  RECOVERING: 'Recovering',
  REGRESSING: 'Regressing',
  INSUFFICIENT_DATA: 'Gathering data',
};

const ACTION_LABELS: Record<VolumeRecommendationAction, string> = {
  NO_ACTION: 'GATHER EVIDENCE',
  MONITOR: 'MONITOR',
  MAINTAIN: 'MAINTAIN',
  ADD_VOLUME_CAUTIOUSLY: 'ADD CAUTIOUSLY',
  HOLD_AND_REVIEW: 'HOLD & REVIEW',
  REDUCE_VOLUME_CAUTIOUSLY: 'REDUCE CAUTIOUSLY',
};

interface PdfFonts {
  regular: PDFFont;
  bold: PDFFont;
}

interface PdfPalette {
  orange: RGB;
  dark: RGB;
  muted: RGB;
  border: RGB;
  light: RGB;
  white: RGB;
  green: RGB;
  danger: RGB;
}

export interface MonthlyTrainingReportPdfContent {
  headline: string;
  actionable: TrainingReportMuscleResult[];
  maintain: TrainingReportMuscleResult[];
  monitor: TrainingReportMuscleResult[];
  gathering: TrainingReportMuscleResult[];
  positiveDirectionCount: number;
  attentionCount: number;
}

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

function muscleName(muscle: TrainingReportMuscleResult): string {
  return MUSCLE_LABELS[muscle.snapshot.muscleGroup]
    ?? muscle.snapshot.muscleGroup;
}

function monthLabel(periodStart: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${periodStart}T00:00:00Z`));
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours <= 0) return `${minutes} min`;
  if (minutes <= 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function formatSets(value: number): string {
  return value.toLocaleString('en-CA', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function actionAdjustment(muscle: TrainingReportMuscleResult): string {
  const { action, weeklyEffectiveSetAdjustment } = muscle.correctivePlan;

  if (action === 'HOLD_AND_REVIEW') return 'Hold volume';
  if (
    weeklyEffectiveSetAdjustment === null
    || weeklyEffectiveSetAdjustment === 0
  ) {
    return 'No set change supported';
  }

  return `${weeklyEffectiveSetAdjustment > 0 ? '+' : '-'}${formatSets(
    Math.abs(weeklyEffectiveSetAdjustment),
  )} effective sets`;
}

export function buildMonthlyTrainingReportPdfContent(
  report: CompletedTrainingReport,
): MonthlyTrainingReportPdfContent {
  if (report.period.periodKind !== 'MONTH') {
    throw new Error('Monthly PDF generation requires a monthly training report.');
  }

  const actionable = report.muscles.filter((muscle) =>
    ACTIONABLE.has(muscle.correctivePlan.action));
  const maintain = report.muscles.filter(
    (muscle) => muscle.correctivePlan.action === 'MAINTAIN',
  );
  const monitor = report.muscles.filter(
    (muscle) => muscle.correctivePlan.action === 'MONITOR',
  );
  const gathering = report.muscles.filter(
    (muscle) => muscle.correctivePlan.action === 'NO_ACTION',
  );

  const positiveDirectionCount = report.muscles.filter((muscle) =>
    muscle.performance.trend === 'IMPROVING'
    || muscle.performance.trend === 'RECOVERING').length;

  const attentionCount = report.muscles.filter((muscle) =>
    muscle.performance.trend === 'PLATEAU'
    || muscle.performance.trend === 'DECLINING'
    || muscle.performance.trend === 'REGRESSING').length;

  const headline = actionable.length > 0
    ? `${actionable.length} muscle group${actionable.length === 1 ? '' : 's'} ${
      actionable.length === 1 ? 'has' : 'have'
    } a supported next-step adjustment.`
    : monitor.length > 0
      ? 'No volume change is supported yet - keep monitoring the signal.'
      : 'No corrective volume change is supported for this completed month.';

  return {
    headline,
    actionable,
    maintain,
    monitor,
    gathering,
    positiveDirectionCount,
    attentionCount,
  };
}

export function monthlyTrainingReportPdfFileName(
  report: CompletedTrainingReport,
): string {
  if (report.period.periodKind !== 'MONTH') {
    throw new Error('Monthly PDF generation requires a monthly training report.');
  }

  return `top-set-training-review-${report.period.periodStart.slice(0, 7)}.pdf`;
}

function wrapText(
  font: PDFFont,
  value: string,
  fontSize: number,
  maxWidth: number,
): string[] {
  const words = safePdfText(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) lines.push(current);

    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = '';
    for (const char of word) {
      const candidate = `${chunk}${char}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        chunk = candidate;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;
  }

  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(
  page: PDFPage,
  font: PDFFont,
  value: string,
  {
    x,
    y,
    size,
    maxWidth,
    lineHeight,
    color,
  }: {
    x: number;
    y: number;
    size: number;
    maxWidth: number;
    lineHeight: number;
    color: RGB;
  },
): number {
  let nextY = y;

  for (const line of wrapText(font, value, size, maxWidth)) {
    page.drawText(line, {
      x,
      y: nextY,
      size,
      font,
      color,
    });
    nextY -= lineHeight;
  }

  return nextY;
}

function drawHeader(
  page: PDFPage,
  fonts: PdfFonts,
  palette: PdfPalette,
  month: string,
  displayName: string,
): void {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - HEADER_HEIGHT,
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
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
    y: PAGE_HEIGHT - 50,
    width: 42,
    height: 4,
    color: palette.orange,
  });

  page.drawText('Monthly Training Review', {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 82,
    size: 24,
    font: fonts.bold,
    color: palette.white,
  });

  page.drawText(
    safePdfText(`${month}  |  ${displayName}`),
    {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 103,
      size: 10,
      font: fonts.regular,
      color: palette.border,
    },
  );
}

function addPage(
  pdf: PDFDocumentType,
  fonts: PdfFonts,
  palette: PdfPalette,
  month: string,
  displayName: string,
): PDFPage {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeader(page, fonts, palette, month, displayName);
  return page;
}

function actionAccent(
  action: VolumeRecommendationAction,
  palette: PdfPalette,
): RGB {
  if (action === 'ADD_VOLUME_CAUTIOUSLY') return palette.orange;
  if (
    action === 'REDUCE_VOLUME_CAUTIOUSLY'
    || action === 'HOLD_AND_REVIEW'
  ) {
    return palette.danger;
  }
  if (action === 'MAINTAIN') return palette.green;
  return palette.muted;
}

function actionCardHeight(
  muscle: TrainingReportMuscleResult,
  fonts: PdfFonts,
): number {
  const rationaleLines = wrapText(
    fonts.regular,
    muscle.correctivePlan.rationale,
    8,
    486,
  ).length;
  const exercises = muscle.correctivePlan.preferredExercises.length > 0
    ? muscle.correctivePlan.preferredExercises.join(' - ')
    : 'Keep familiar movements while more evidence accumulates';
  const exerciseLines = wrapText(fonts.regular, exercises, 7.5, 310).length;

  return Math.max(
    126,
    108 + rationaleLines * 11 + Math.max(0, exerciseLines - 1) * 9,
  );
}

function drawActionCard(
  page: PDFPage,
  muscle: TrainingReportMuscleResult,
  yTop: number,
  height: number,
  fonts: PdfFonts,
  palette: PdfPalette,
): number {
  const accent = actionAccent(muscle.correctivePlan.action, palette);
  const bottom = yTop - height;

  page.drawRectangle({
    x: MARGIN_X,
    y: bottom,
    width: CONTENT_WIDTH,
    height,
    color: palette.white,
    borderColor: palette.border,
    borderWidth: 1,
  });

  page.drawRectangle({
    x: MARGIN_X,
    y: bottom,
    width: 4,
    height,
    color: accent,
  });

  page.drawText(safePdfText(muscleName(muscle).toUpperCase()), {
    x: MARGIN_X + 16,
    y: yTop - 26,
    size: 14,
    font: fonts.bold,
    color: palette.dark,
  });

  const actionLabel = ACTION_LABELS[muscle.correctivePlan.action];
  const actionWidth = fonts.bold.widthOfTextAtSize(actionLabel, 7);
  page.drawText(actionLabel, {
    x: PAGE_WIDTH - MARGIN_X - actionWidth - 16,
    y: yTop - 24,
    size: 7,
    font: fonts.bold,
    color: accent,
  });

  page.drawText(safePdfText(actionAdjustment(muscle)), {
    x: MARGIN_X + 16,
    y: yTop - 52,
    size: 15,
    font: fonts.bold,
    color: palette.dark,
  });

  const trend = `${TREND_LABELS[muscle.performance.trend]} performance signal`;
  const trendWidth = fonts.regular.widthOfTextAtSize(trend, 8);
  page.drawText(trend, {
    x: PAGE_WIDTH - MARGIN_X - trendWidth - 16,
    y: yTop - 50,
    size: 8,
    font: fonts.regular,
    color: palette.muted,
  });

  page.drawText(safePdfText(muscle.correctivePlan.headline), {
    x: MARGIN_X + 16,
    y: yTop - 76,
    size: 9,
    font: fonts.bold,
    color: palette.dark,
  });

  drawWrappedText(
    page,
    fonts.regular,
    muscle.correctivePlan.rationale,
    {
      x: MARGIN_X + 16,
      y: yTop - 92,
      size: 8,
      maxWidth: CONTENT_WIDTH - 32,
      lineHeight: 11,
      color: palette.muted,
    },
  );

  page.drawText('FAMILIAR WORK', {
    x: MARGIN_X + 16,
    y: bottom + 18,
    size: 7,
    font: fonts.bold,
    color: palette.muted,
  });

  const exercises = muscle.correctivePlan.preferredExercises.length > 0
    ? muscle.correctivePlan.preferredExercises.join(' - ')
    : 'Keep familiar movements while more evidence accumulates';

  const exerciseLines = wrapText(fonts.regular, exercises, 7.5, 310);
  let exerciseY = bottom + 18 + (exerciseLines.length - 1) * 9;

  for (const line of exerciseLines) {
    const width = fonts.regular.widthOfTextAtSize(line, 7.5);
    page.drawText(line, {
      x: PAGE_WIDTH - MARGIN_X - width - 16,
      y: exerciseY,
      size: 7.5,
      font: fonts.regular,
      color: palette.dark,
    });
    exerciseY -= 9;
  }

  return bottom;
}

function drawFactCard(
  page: PDFPage,
  fonts: PdfFonts,
  palette: PdfPalette,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  description: string,
): void {
  page.drawRectangle({
    x,
    y,
    width,
    height: 70,
    color: palette.light,
  });

  page.drawText(label, {
    x: x + 12,
    y: y + 50,
    size: 7,
    font: fonts.bold,
    color: palette.muted,
  });

  page.drawText(value, {
    x: x + 12,
    y: y + 29,
    size: 16,
    font: fonts.bold,
    color: palette.dark,
  });

  page.drawText(description, {
    x: x + 12,
    y: y + 12,
    size: 7.5,
    font: fonts.regular,
    color: palette.muted,
  });
}

function drawQuietGroup(
  pdf: PDFDocumentType,
  page: PDFPage,
  yStart: number,
  {
    title,
    description,
    muscles,
    month,
    displayName,
  }: {
    title: string;
    description: string;
    muscles: TrainingReportMuscleResult[];
    month: string;
    displayName: string;
  },
  fonts: PdfFonts,
  palette: PdfPalette,
): { page: PDFPage; y: number } {
  if (muscles.length === 0) return { page, y: yStart };

  let currentPage = page;
  let y = yStart;
  const rowHeight = 32;
  const needed = 45 + muscles.length * rowHeight + 10;

  if (y - needed < CONTENT_BOTTOM) {
    currentPage = addPage(pdf, fonts, palette, month, displayName);
    y = CONTENT_TOP;
  }

  currentPage.drawText(title, {
    x: MARGIN_X,
    y,
    size: 9,
    font: fonts.bold,
    color: palette.orange,
  });
  y -= 15;

  currentPage.drawText(safePdfText(description), {
    x: MARGIN_X,
    y,
    size: 8,
    font: fonts.regular,
    color: palette.muted,
  });
  y -= 20;

  for (const muscle of muscles) {
    if (y - rowHeight < CONTENT_BOTTOM) {
      currentPage = addPage(pdf, fonts, palette, month, displayName);
      y = CONTENT_TOP;
    }

    currentPage.drawLine({
      start: { x: MARGIN_X, y: y + 8 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: y + 8 },
      thickness: 0.7,
      color: palette.border,
    });

    currentPage.drawText(safePdfText(muscleName(muscle)), {
      x: MARGIN_X + 8,
      y: y - 8,
      size: 9,
      font: fonts.bold,
      color: palette.dark,
    });

    currentPage.drawText(TREND_LABELS[muscle.performance.trend], {
      x: 185,
      y: y - 8,
      size: 8,
      font: fonts.regular,
      color: palette.muted,
    });

    const summary = wrapText(
      fonts.regular,
      muscle.correctivePlan.headline,
      8,
      PAGE_WIDTH - MARGIN_X - 300,
    )[0] ?? '';

    currentPage.drawText(summary, {
      x: 300,
      y: y - 8,
      size: 8,
      font: fonts.regular,
      color: palette.muted,
    });

    y -= rowHeight;
  }

  return { page: currentPage, y: y - 18 };
}

export async function generateMonthlyTrainingReportPdf(
  report: CompletedTrainingReport,
  displayName: string,
): Promise<Uint8Array> {
  const content = buildMonthlyTrainingReportPdfContent(report);
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const pdf = await PDFDocument.create();
  pdf.setTitle(
    `Top Set Monthly Training Review - ${monthLabel(report.period.periodStart)}`,
  );
  pdf.setAuthor('Top Set');
  pdf.setSubject('Monthly performance-aware training review');
  pdf.setProducer('Top Set training-report-v1');

  const fonts: PdfFonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const palette: PdfPalette = {
    orange: rgb(241 / 255, 90 / 255, 8 / 255),
    dark: rgb(18 / 255, 19 / 255, 22 / 255),
    muted: rgb(110 / 255, 115 / 255, 123 / 255),
    border: rgb(222 / 255, 225 / 255, 229 / 255),
    light: rgb(244 / 255, 245 / 255, 247 / 255),
    white: rgb(1, 1, 1),
    green: rgb(46 / 255, 139 / 255, 87 / 255),
    danger: rgb(179 / 255, 58 / 255, 58 / 255),
  };

  const month = monthLabel(report.period.periodStart);
  let page = addPage(pdf, fonts, palette, month, displayName);
  let y = CONTENT_TOP;

  page.drawText('REPORT BRIEF', {
    x: MARGIN_X,
    y,
    size: 9,
    font: fonts.bold,
    color: palette.orange,
  });
  y -= 24;

  y = drawWrappedText(page, fonts.bold, content.headline, {
    x: MARGIN_X,
    y,
    size: 18,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 22,
    color: palette.dark,
  });

  y -= 5;
  y = drawWrappedText(
    page,
    fonts.regular,
    'This report focuses on what changed and what to do next. Raw sessions, working sets, PR counts, exercise totals, and load-volume charts remain on the main Progress screen.',
    {
      x: MARGIN_X,
      y,
      size: 9,
      maxWidth: CONTENT_WIDTH,
      lineHeight: 13,
      color: palette.muted,
    },
  );

  y -= 18;

  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap * 2) / 3;
  const cardY = y - 70;

  drawFactCard(
    page,
    fonts,
    palette,
    MARGIN_X,
    cardY,
    cardWidth,
    'ACTIVE TRAINING',
    formatDuration(report.period.activeTrainingSeconds),
    'Frozen completed-month source',
  );
  drawFactCard(
    page,
    fonts,
    palette,
    MARGIN_X + cardWidth + gap,
    cardY,
    cardWidth,
    'POSITIVE DIRECTION',
    String(content.positiveDirectionCount),
    'Improving or recovering',
  );
  drawFactCard(
    page,
    fonts,
    palette,
    MARGIN_X + (cardWidth + gap) * 2,
    cardY,
    cardWidth,
    'NEEDS ATTENTION',
    String(content.attentionCount),
    'Plateau or negative signal',
  );

  y = cardY - 28;

  page.drawText('NEXT 7 DAYS', {
    x: MARGIN_X,
    y,
    size: 9,
    font: fonts.bold,
    color: palette.orange,
  });
  y -= 18;

  if (content.actionable.length === 0) {
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 80,
      width: CONTENT_WIDTH,
      height: 80,
      color: palette.light,
      borderColor: palette.border,
      borderWidth: 1,
    });

    page.drawText('No corrective change supported', {
      x: MARGIN_X + 16,
      y: y - 28,
      size: 10,
      font: fonts.bold,
      color: palette.green,
    });

    page.drawText('Keep the current plan intact.', {
      x: MARGIN_X + 16,
      y: y - 49,
      size: 14,
      font: fonts.bold,
      color: palette.dark,
    });

    page.drawText(
      'The available evidence does not justify adding or cutting sets.',
      {
        x: MARGIN_X + 16,
        y: y - 66,
        size: 8,
        font: fonts.regular,
        color: palette.muted,
      },
    );
    y -= 96;
  } else {
    for (const muscle of content.actionable) {
      const height = actionCardHeight(muscle, fonts);

      if (y - height < CONTENT_BOTTOM) {
        page = addPage(pdf, fonts, palette, month, displayName);
        y = CONTENT_TOP;
      }

      y = drawActionCard(
        page,
        muscle,
        y,
        height,
        fonts,
        palette,
      ) - 14;
    }
  }

  const groups = [
    {
      title: 'KEEP STEADY',
      description: 'Current evidence supports maintaining volume.',
      muscles: content.maintain,
    },
    {
      title: "WATCH, DON'T REACT",
      description: 'Worth watching, but not enough to change volume.',
      muscles: content.monitor,
    },
    {
      title: 'STILL GATHERING EVIDENCE',
      description: 'Not enough comparable performance evidence yet.',
      muscles: content.gathering,
    },
  ];

  for (const group of groups) {
    const result = drawQuietGroup(
      pdf,
      page,
      y,
      { ...group, month, displayName },
      fonts,
      palette,
    );
    page = result.page;
    y = result.y;
  }

  const pages = pdf.getPages();

  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: MARGIN_X, y: FOOTER_Y + 18 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: FOOTER_Y + 18 },
      thickness: 0.7,
      color: palette.border,
    });

    currentPage.drawText(
      safePdfText(
        `Report: ${report.reportVersion}  |  Methodology: ${
          report.methodologyVersion ?? 'unavailable'
        }`,
      ),
      {
        x: MARGIN_X,
        y: FOOTER_Y,
        size: 6.5,
        font: fonts.regular,
        color: palette.muted,
      },
    );

    const pageLabel = `${index + 1} / ${pages.length}`;
    const width = fonts.regular.widthOfTextAtSize(pageLabel, 6.5);
    currentPage.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN_X - width,
      y: FOOTER_Y,
      size: 6.5,
      font: fonts.regular,
      color: palette.muted,
    });
  });

  return pdf.save();
}

export async function downloadMonthlyTrainingReportPdf(
  report: CompletedTrainingReport,
  displayName: string,
): Promise<void> {
  const bytes = await generateMonthlyTrainingReportPdf(report, displayName);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = monthlyTrainingReportPdfFileName(report);
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
