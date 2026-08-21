"use client";

interface Point {
  date: string;
  percentage: number;
}

export function MarksChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Answer a few more questions to see your progress over time.
      </p>
    );
  }

  const width = 600;
  const height = 160;
  const padding = 8;

  const stepX = (width - padding * 2) / (points.length - 1);
  const toY = (pct: number) => height - padding - (pct / 100) * (height - padding * 2);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${padding + i * stepX} ${toY(p.percentage)}`)
    .join(" ");

  const areaPath = `${linePath} L ${padding + (points.length - 1) * stepX} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="marksGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#marksGradient)" />
      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={padding + i * stepX} cy={toY(p.percentage)} r={3} fill="var(--primary)" />
      ))}
    </svg>
  );
}
