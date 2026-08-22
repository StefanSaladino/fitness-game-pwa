import styles from './ExerciseTrendChart.module.css';

export interface ExerciseTrendChartPoint {
  id: string;
  observedAt: string;
  value: number;
}

interface ExerciseTrendChartProps {
  title: string;
  description: string;
  points: ExerciseTrendChartPoint[];
  formatValue: (value: number) => string;
  variant?: 'line' | 'bars';
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD_X = 34;
const PAD_Y = 24;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

export function ExerciseTrendChart({ title, description, points, formatValue, variant = 'line' }: ExerciseTrendChartProps) {
  const values = points.map((point) => point.value);
  const minimum = variant === 'bars' ? 0 : values.length > 0 ? Math.min(...values) : 0;
  const maximum = values.length > 0 ? Math.max(...values) : 0;
  const spread = Math.max(maximum - minimum, maximum === 0 ? 1 : maximum * 0.08);
  const xFor = (index: number) => points.length <= 1
    ? WIDTH / 2
    : PAD_X + (index / (points.length - 1)) * (WIDTH - PAD_X * 2);
  const yFor = (value: number) => HEIGHT - PAD_Y - ((value - minimum) / spread) * (HEIGHT - PAD_Y * 2);
  const polyline = points.map((point, index) => `${xFor(index)},${yFor(point.value)}`).join(' ');

  return (
    <section className={styles.chartCard} aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}>
      <header className={styles.chartHeader}>
        <div>
          <p>Trend</p>
          <h3 id={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}>{title}</h3>
        </div>
        <span>{description}</span>
      </header>

      {points.length === 0 ? (
        <p className={styles.empty}>Not enough completed-session data yet.</p>
      ) : (
        <>
          <svg
            aria-label={`${title}. ${points.length} session${points.length === 1 ? '' : 's'} from ${formatDate(points[0]!.observedAt)} to ${formatDate(points.at(-1)!.observedAt)}.`}
            className={styles.chart}
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            <line className={styles.gridLine} x1={PAD_X} x2={WIDTH - PAD_X} y1={PAD_Y} y2={PAD_Y} />
            <line className={styles.gridLine} x1={PAD_X} x2={WIDTH - PAD_X} y1={HEIGHT / 2} y2={HEIGHT / 2} />
            <line className={styles.gridLine} x1={PAD_X} x2={WIDTH - PAD_X} y1={HEIGHT - PAD_Y} y2={HEIGHT - PAD_Y} />
            {variant === 'line' ? (
              <>
                {points.length > 1 && <polyline className={styles.trendLine} fill="none" points={polyline} />}
                {points.map((point, index) => (
                  <circle className={styles.point} cx={xFor(index)} cy={yFor(point.value)} key={point.id} r="5">
                    <title>{`${formatDate(point.observedAt)}: ${formatValue(point.value)}`}</title>
                  </circle>
                ))}
              </>
            ) : points.map((point, index) => {
              const slot = (WIDTH - PAD_X * 2) / Math.max(points.length, 1);
              const barWidth = Math.min(38, slot * 0.58);
              const y = yFor(point.value);
              return (
                <rect
                  className={styles.bar}
                  height={Math.max(2, HEIGHT - PAD_Y - y)}
                  key={point.id}
                  rx="4"
                  width={barWidth}
                  x={PAD_X + index * slot + (slot - barWidth) / 2}
                  y={y}
                >
                  <title>{`${formatDate(point.observedAt)}: ${formatValue(point.value)}`}</title>
                </rect>
              );
            })}
          </svg>
          <div className={styles.chartFooter}>
            <span>{formatDate(points[0]!.observedAt)}</span>
            <strong>{formatValue(points.at(-1)!.value)}</strong>
            <span>{formatDate(points.at(-1)!.observedAt)}</span>
          </div>
        </>
      )}
    </section>
  );
}
