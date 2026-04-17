"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type EpdAssessment = {
  id?: string;
  score: number;
  submittedAt: string | null;
  label?: string;
};

type Props = {
  history?: EpdAssessment[];
  fallbackScore?: number | null;
  fallbackSubmittedAt?: string | null;
};

type WeekPoint = {
  score: number;
  submittedAt: string | null;
};

type MonthEntry = {
  key: string;
  label: string;
  weeks: Array<WeekPoint | null>;
  weekCount: 4 | 5;
};

function riskClass(score: number) {
  if (score > 13) return "high";
  if (score >= 10) return "moderate";
  return "low";
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getWeekIndex(date: Date) {
  const day = date.getDate();
  if (day <= 7) return 0;
  if (day <= 14) return 1;
  if (day <= 21) return 2;
  if (day <= 28) return 3;
  return 4;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-LK", {
    month: "long",
    year: "numeric",
  });
}

function monthWeekCount(date: Date): 4 | 5 {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return daysInMonth > 28 ? 5 : 4;
}

export default function EpdsTrendChart({
  history = [],
  fallbackScore,
  fallbackSubmittedAt,
}: Props) {
  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);

  const months = useMemo<MonthEntry[]>(() => {
    const monthMap = new Map<string, MonthEntry>();
    const sortedHistory = [...history].sort((left, right) => {
      const leftTime = toDate(left.submittedAt)?.getTime() ?? 0;
      const rightTime = toDate(right.submittedAt)?.getTime() ?? 0;
      return leftTime - rightTime;
    });

    sortedHistory.forEach((entry) => {
      const date = toDate(entry.submittedAt);
      if (!date || !Number.isFinite(entry.score)) {
        return;
      }

      const key = monthKey(date);
      const existing =
        monthMap.get(key) ||
        {
          key,
          label: monthLabel(date),
          weeks: [null, null, null, null, null],
          weekCount: monthWeekCount(date),
        };

      const week = getWeekIndex(date);
      const currentPoint = existing.weeks[week];
      const currentDate = toDate(currentPoint?.submittedAt);

      if (!currentPoint || !currentDate || currentDate.getTime() <= date.getTime()) {
        existing.weeks[week] = {
          score: Number(entry.score),
          submittedAt: entry.submittedAt,
        };
      }

      monthMap.set(key, existing);
    });

    if (monthMap.size === 0 && Number(fallbackScore) > 0) {
      const fallbackDate = toDate(fallbackSubmittedAt || null) || new Date();
      const key = monthKey(fallbackDate);
      const weeks: Array<WeekPoint | null> = [null, null, null, null, null];
      weeks[getWeekIndex(fallbackDate)] = {
        score: Number(fallbackScore),
        submittedAt: fallbackDate.toISOString(),
      };
      monthMap.set(key, {
        key,
        label: monthLabel(fallbackDate),
        weeks,
        weekCount: monthWeekCount(fallbackDate),
      });
    }

    return Array.from(monthMap.values()).sort((left, right) => right.key.localeCompare(left.key));
  }, [fallbackScore, fallbackSubmittedAt, history]);

  const resolvedSelectedMonthKey =
    selectedMonthKey && months.some((month) => month.key === selectedMonthKey)
      ? selectedMonthKey
      : months[0]?.key ?? "";

  const selectedMonth =
    months.find((month) => month.key === resolvedSelectedMonthKey) || months[0] || null;
  const selectedMonthIndex = months.findIndex((month) => month.key === selectedMonth?.key);
  const visibleWeekLabels = selectedMonth?.weekCount === 4
    ? ["1st Week", "2nd Week", "3rd Week", "4th Week"]
    : ["1st Week", "2nd Week", "3rd Week", "4th Week", "5th Week"];
  const weekAxisPositions =
    visibleWeekLabels.length === 4
      ? [54, 120, 186, 252]
      : [76, 136, 196, 256, 316];

  const chartPoints = selectedMonth
    ? selectedMonth.weeks
        .map((week, index) =>
          week && index < visibleWeekLabels.length
            ? {
                ...week,
                x: weekAxisPositions[index] ?? weekAxisPositions[weekAxisPositions.length - 1],
                y: 210 - Math.min(30, Math.max(0, week.score)) * 6,
                key: `${selectedMonth.key}-${index}`,
                risk: riskClass(week.score),
              }
            : null,
        )
        .filter((point): point is NonNullable<typeof point> => Boolean(point))
    : [];

  return (
    <div className="epds-chart-card">
      {chartPoints.length > 0 && selectedMonth ? (
        <>
          <svg viewBox="0 0 360 250" className="epds-chart" aria-label="EPDS score trend">
            {[0, 5, 10, 15, 20, 25, 30].map((tick) => {
              const y = 210 - tick * 6;
              return (
                <g key={tick}>
                  <line x1="52" y1={y} x2="326" y2={y} className="chart-grid-line" />
                  <text x="18" y={y + 4} className="chart-axis-label">
                    {String(tick).padStart(2, "0")}
                  </text>
                </g>
              );
            })}
            {chartPoints.length > 1 ? (
              <polyline
                fill="none"
                stroke="#499d85"
                strokeWidth="2"
                points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")}
              />
            ) : null}
            {chartPoints.map((point) => (
              <g
                key={point.key}
                onMouseEnter={() => setHoveredPointKey(point.key)}
                onMouseLeave={() => setHoveredPointKey((current) => (current === point.key ? null : current))}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  className={`chart-point risk-${point.risk}`}
                >
                  <title>
                    {`EPDS score: ${point.score}${point.submittedAt ? ` on ${new Date(point.submittedAt).toLocaleString("en-LK")}` : ""}`}
                  </title>
                </circle>
                {hoveredPointKey === point.key ? (
                  <>
                    <rect
                      x={point.x - 28}
                      y={point.y - 34}
                      rx="8"
                      ry="8"
                      width="56"
                      height="22"
                      className="chart-tooltip-box"
                    />
                    <text
                      x={point.x}
                      y={point.y - 19}
                      textAnchor="middle"
                      className="chart-tooltip-text"
                    >
                      {point.score}
                    </text>
                  </>
                ) : null}
              </g>
            ))}
            {visibleWeekLabels.map((label, index) => (
              <text
                key={label}
                x={weekAxisPositions[index] ?? weekAxisPositions[weekAxisPositions.length - 1]}
                y="236"
                className="chart-axis-label x-axis"
              >
                {label}
              </text>
            ))}
          </svg>

          {months.length > 1 ? (
            <div className="month-toggle-row">
              <div className="month-toggle-group">
                <button
                  className="month-toggle-btn"
                  onClick={() => {
                    if (selectedMonthIndex < months.length - 1) {
                      setSelectedMonthKey(months[selectedMonthIndex + 1].key);
                    }
                  }}
                  disabled={selectedMonthIndex >= months.length - 1}
                  type="button"
                  title="Previous Month"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="selected-month-label">{selectedMonth.label}</span>
                <button
                  className="month-toggle-btn"
                  onClick={() => {
                    if (selectedMonthIndex > 0) {
                      setSelectedMonthKey(months[selectedMonthIndex - 1].key);
                    }
                  }}
                  disabled={selectedMonthIndex <= 0}
                  type="button"
                  title="Next Month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : null}

          <p className="chart-month-label">{selectedMonth.label}</p>
        </>
      ) : (
        <div className="epds-empty-state">
          <h4>No EPDS tests recorded</h4>
          <p>EPDS trend points will appear here after the mother submits assessments.</p>
        </div>
      )}
    </div>
  );
}
