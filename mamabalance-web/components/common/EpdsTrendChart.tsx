"use client";

import { useMemo, useState } from "react";

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
  label: string;
  date: Date | null;
};

type WeekSlot = {
  key: string;
  label: string;
  monthLabel: string;
};

function ordinalWeek(value: number) {
  if (value === 1) return "1st Week";
  if (value === 2) return "2nd Week";
  if (value === 3) return "3rd Week";
  return `${value}th Week`;
}

function weekOfMonth(date: Date) {
  return Math.min(5, Math.floor((date.getDate() - 1) / 7) + 1);
}

function slotKeyForDate(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${weekOfMonth(date)}`;
}

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

export default function EpdsTrendChart({
  history = [],
  fallbackScore,
  fallbackSubmittedAt,
}: Props) {
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);

  const chartHistory = useMemo<WeekPoint[]>(() => {
    const sortedHistory = [...history]
      .filter((entry) => Number.isFinite(entry.score))
      .sort((left, right) => {
      const leftTime = toDate(left.submittedAt)?.getTime() ?? 0;
      const rightTime = toDate(right.submittedAt)?.getTime() ?? 0;
      return leftTime - rightTime;
    });

    if (sortedHistory.length > 0) {
      return sortedHistory.map((entry) => ({
        score: Number(entry.score),
        submittedAt: entry.submittedAt,
        date: toDate(entry.submittedAt),
        label: entry.label || (entry.submittedAt ? new Date(entry.submittedAt).toLocaleDateString("en-LK") : "EPDS"),
      }));
    }

    if (Number(fallbackScore) > 0) {
      const fallbackDate = toDate(fallbackSubmittedAt || null) || new Date();
      return [
        {
          score: Number(fallbackScore),
          submittedAt: fallbackDate.toISOString(),
          date: fallbackDate,
          label: fallbackDate.toLocaleDateString("en-LK", {
            month: "short",
            day: "numeric",
          }),
        },
      ];
    }

    return [];
  }, [fallbackScore, fallbackSubmittedAt, history]);

  const chartPoints = useMemo(() => {
    if (chartHistory.length === 0) {
      return [];
    }

    const monthKeys = new Set(
      chartHistory
        .map((point) => (point.date ? `${point.date.getFullYear()}-${point.date.getMonth()}` : ""))
        .filter(Boolean),
    );
    const showMonthInWeekLabel = monthKeys.size > 1;
    const weekSlots = chartHistory.reduce<WeekSlot[]>((slots, point) => {
      if (!point.date) {
        return slots;
      }

      const key = slotKeyForDate(point.date);
      if (slots.some((slot) => slot.key === key)) {
        return slots;
      }

      slots.push({
        key,
        label: ordinalWeek(weekOfMonth(point.date)),
        monthLabel: point.date.toLocaleDateString("en-LK", { month: "short" }),
      });
      return slots;
    }, []);

    const leftX = 76;
    const rightX = 316;
    const slotGap = weekSlots.length === 1 ? 0 : (rightX - leftX) / (weekSlots.length - 1);
    const dayOffsetRange = slotGap > 0 ? Math.min(12, slotGap * 0.22) : 12;

    return chartHistory.map((point, index) => {
      const date = point.date;
      const slotKey = date ? slotKeyForDate(date) : `unknown-${index}`;
      const slotIndex = weekSlots.findIndex((slot) => slot.key === slotKey);
      const slotCenterX =
        weekSlots.length === 1 || slotIndex === -1
          ? (leftX + rightX) / 2
          : leftX + slotGap * slotIndex;
      const dayInWeek = date ? ((date.getDate() - 1) % 7) + 1 : 4;
      const dayOffset = ((dayInWeek - 4) / 3) * dayOffsetRange;
      const slot = weekSlots[slotIndex];

      return {
        ...point,
        x: slotCenterX + dayOffset,
        y: 210 - Math.min(30, Math.max(0, point.score)) * 6,
        key: `epds-${index}`,
        risk: riskClass(point.score),
        dayLabel: date ? String(date.getDate()) : point.label,
        weekLabel: slot ? slot.label : "Week",
        monthLabel: slot ? slot.monthLabel : "",
        showMonthInWeekLabel,
      };
    });
  }, [chartHistory]);

  const weekLabels = useMemo(() => {
    const labels = chartPoints.reduce<Array<{
      key: string;
      x: number;
      weekLabel: string;
      monthLabel: string;
      showMonthInWeekLabel: boolean;
    }>>((items, point) => {
      if (items.some((item) => item.key === `${point.monthLabel}-${point.weekLabel}`)) {
        return items;
      }

      items.push({
        key: `${point.monthLabel}-${point.weekLabel}`,
        x: point.x,
        weekLabel: point.weekLabel,
        monthLabel: point.monthLabel,
        showMonthInWeekLabel: point.showMonthInWeekLabel,
      });
      return items;
    }, []);

    return labels;
  }, [chartPoints]);

  const chartRangeLabel = useMemo(() => {
    if (chartHistory.length === 0) {
      return "All EPDS Assessments";
    }

    const datedPoints = chartHistory.filter((point) => point.date);
    if (datedPoints.length === 0) {
      return "All EPDS Assessments";
    }

    const firstDate = datedPoints[0].date as Date;
    const lastDate = datedPoints[datedPoints.length - 1].date as Date;
    const firstMonth = firstDate.toLocaleDateString("en-LK", { month: "long", year: "numeric" });
    const lastMonth = lastDate.toLocaleDateString("en-LK", { month: "long", year: "numeric" });

    return firstMonth === lastMonth ? firstMonth : `${firstMonth} - ${lastMonth}`;
  }, [chartHistory]);

  return (
    <div className="epds-chart-card">
      {chartPoints.length > 0 ? (
        <>
          <svg viewBox="0 0 360 270" className="epds-chart" aria-label="EPDS score trend">
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
                <text
                  x={point.x}
                  y="226"
                  className="chart-day-label"
                  textAnchor="middle"
                >
                  {point.dayLabel}
                </text>
              </g>
            ))}
            {weekLabels.map((label) => (
              <text
                key={`label-${label.key}`}
                x={label.x}
                y="244"
                className="chart-axis-label x-axis"
              >
                {label.showMonthInWeekLabel ? (
                  <>
                    <tspan x={label.x} dy="0">{label.monthLabel}</tspan>
                    <tspan x={label.x} dy="11">{label.weekLabel}</tspan>
                  </>
                ) : (
                  label.weekLabel
                )}
              </text>
            ))}
          </svg>
          <p className="chart-month-label">{chartRangeLabel}</p>
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
