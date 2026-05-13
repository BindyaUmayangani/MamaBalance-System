"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

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

type AxisLabel = {
  key: string;
  x: number;
  lines: string[];
};

type ChartPoint = WeekPoint & {
  x: number;
  y: number;
  key: string;
  risk: "low" | "moderate" | "high";
  dayLabel: string;
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

function monthKeyForDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function riskClass(score: number): "low" | "moderate" | "high" {
  if (score > 13) return "high";
  if (score >= 10) return "moderate";
  return "low";
}

function riskLabel(score: number) {
  const label = riskClass(score);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-LK", { month: "long", year: "numeric" });
}

function formatShortDate(date: Date | null, fallback: string) {
  if (!date) return fallback;
  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildWeeklyChartLayout(chartHistory: WeekPoint[]) {
  if (chartHistory.length === 0) {
    return { points: [] as ChartPoint[], axisLabels: [] as AxisLabel[] };
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

  const points = chartHistory.map<ChartPoint>((point, index) => {
    const date = point.date;
    const slotKey = date ? slotKeyForDate(date) : `unknown-${index}`;
    const slotIndex = weekSlots.findIndex((slot) => slot.key === slotKey);
    const slotCenterX =
      weekSlots.length === 1 || slotIndex === -1
        ? (leftX + rightX) / 2
        : leftX + slotGap * slotIndex;
    const dayInWeek = date ? ((date.getDate() - 1) % 7) + 1 : 4;
    const dayOffset = ((dayInWeek - 4) / 3) * dayOffsetRange;

    return {
      ...point,
      x: slotCenterX + dayOffset,
      y: 210 - Math.min(30, Math.max(0, point.score)) * 6,
      key: `epds-${index}`,
      risk: riskClass(point.score),
      dayLabel: date ? String(date.getDate()) : point.label,
    };
  });

  const axisLabels = points.reduce<AxisLabel[]>((items, point, index) => {
    const date = point.date;
    const slotKey = date ? slotKeyForDate(date) : `unknown-${index}`;
    const slot = weekSlots.find((item) => item.key === slotKey);
    const key = slot ? `${slot.monthLabel}-${slot.label}` : point.key;

    if (items.some((item) => item.key === key)) {
      return items;
    }

    items.push({
      key,
      x: point.x,
      lines: slot
        ? showMonthInWeekLabel
          ? [slot.monthLabel, slot.label]
          : [slot.label]
        : [point.label],
    });
    return items;
  }, []);

  return { points, axisLabels };
}

function buildHistoryChartLayout(chartHistory: WeekPoint[]) {
  if (chartHistory.length === 0) {
    return { points: [] as ChartPoint[], axisLabels: [] as AxisLabel[] };
  }

  const leftX = 74;
  const rightX = 672;
  const gap = chartHistory.length === 1 ? 0 : (rightX - leftX) / (chartHistory.length - 1);
  const labelStep = chartHistory.length <= 8 ? 1 : Math.ceil(chartHistory.length / 8);

  const points = chartHistory.map<ChartPoint>((point, index) => ({
    ...point,
    x: chartHistory.length === 1 ? (leftX + rightX) / 2 : leftX + gap * index,
    y: 236 - Math.min(30, Math.max(0, point.score)) * 6.3,
    key: `epds-history-${index}`,
    risk: riskClass(point.score),
    dayLabel: point.date ? String(point.date.getDate()) : point.label,
  }));

  const axisLabels = points
    .filter((point, index) => index === 0 || index === points.length - 1 || index % labelStep === 0)
    .map<AxisLabel>((point, index) => ({
      key: `history-label-${index}-${point.key}`,
      x: point.x,
      lines: point.date
        ? [
            point.date.toLocaleDateString("en-LK", { month: "short" }),
            String(point.date.getDate()),
          ]
        : [point.label],
    }));

  return { points, axisLabels };
}

function ChartSvg({
  points,
  axisLabels,
  hoveredPointKey,
  onHoverPoint,
  full = false,
}: {
  points: ChartPoint[];
  axisLabels: AxisLabel[];
  hoveredPointKey: string | null;
  onHoverPoint: (key: string | null) => void;
  full?: boolean;
}) {
  const viewBox = full ? "0 0 740 330" : "0 0 360 270";
  const gridStartX = full ? 54 : 52;
  const gridEndX = full ? 696 : 326;
  const baseY = full ? 236 : 210;
  const scale = full ? 6.3 : 6;
  const dayLabelY = full ? 256 : 226;
  const axisLabelY = full ? 282 : 244;

  return (
    <svg
      viewBox={viewBox}
      className={`epds-chart ${full ? "epds-chart-full" : ""}`}
      aria-label={full ? "Full EPDS score history trend" : "EPDS score trend"}
    >
      {[0, 5, 10, 15, 20, 25, 30].map((tick) => {
        const y = baseY - tick * scale;
        return (
          <g key={tick}>
            <line x1={gridStartX} y1={y} x2={gridEndX} y2={y} className="chart-grid-line" />
            <text x={full ? 22 : 18} y={y + 4} className="chart-axis-label">
              {String(tick).padStart(2, "0")}
            </text>
          </g>
        );
      })}
      {points.length > 1 ? (
        <polyline
          fill="none"
          stroke="#499d85"
          strokeWidth={full ? "3" : "2"}
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        />
      ) : null}
      {points.map((point) => (
        <g
          key={point.key}
          onMouseEnter={() => onHoverPoint(point.key)}
          onMouseLeave={() => onHoverPoint(null)}
        >
          <circle
            cx={point.x}
            cy={point.y}
            r={full ? "7" : "6"}
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
          {!full ? (
            <text x={point.x} y={dayLabelY} className="chart-day-label" textAnchor="middle">
              {point.dayLabel}
            </text>
          ) : null}
        </g>
      ))}
      {axisLabels.map((label) => (
        <text key={`label-${label.key}`} x={label.x} y={axisLabelY} className="chart-axis-label x-axis">
          {label.lines.map((line, index) => (
            <tspan key={`${label.key}-${line}-${index}`} x={label.x} dy={index === 0 ? 0 : 13}>
              {line}
            </tspan>
          ))}
        </text>
      ))}
    </svg>
  );
}

export default function EpdsTrendChart({
  history = [],
  fallbackScore,
  fallbackSubmittedAt,
}: Props) {
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);
  const [hoveredHistoryPointKey, setHoveredHistoryPointKey] = useState<string | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

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

  const monthOptions = useMemo(() => {
    return chartHistory.reduce<Array<{ key: string; label: string }>>((items, point) => {
      if (!point.date) {
        return items;
      }

      const key = monthKeyForDate(point.date);
      if (items.some((item) => item.key === key)) {
        return items;
      }

      items.push({ key, label: formatMonthLabel(point.date) });
      return items;
    }, []);
  }, [chartHistory]);

  useEffect(() => {
    if (!isHistoryModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsHistoryModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHistoryModalOpen]);

  const effectiveSelectedMonthKey = monthOptions.some((option) => option.key === selectedMonthKey)
    ? selectedMonthKey
    : monthOptions[monthOptions.length - 1]?.key || "";
  const selectedMonthIndex = monthOptions.findIndex((option) => option.key === effectiveSelectedMonthKey);
  const selectedMonthLabel =
    monthOptions[selectedMonthIndex]?.label ||
    (chartHistory.length > 0 ? "All EPDS Assessments" : "No EPDS Assessments");
  const canGoPreviousMonth = selectedMonthIndex > 0;
  const canGoNextMonth = selectedMonthIndex >= 0 && selectedMonthIndex < monthOptions.length - 1;

  const visibleHistory = useMemo(() => {
    if (!effectiveSelectedMonthKey) {
      return chartHistory;
    }

    return chartHistory.filter((point) => point.date && monthKeyForDate(point.date) === effectiveSelectedMonthKey);
  }, [chartHistory, effectiveSelectedMonthKey]);

  const compactLayout = useMemo(() => buildWeeklyChartLayout(visibleHistory), [visibleHistory]);
  const historyLayout = useMemo(() => buildHistoryChartLayout(chartHistory), [chartHistory]);

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
    const firstMonth = formatMonthLabel(firstDate);
    const lastMonth = formatMonthLabel(lastDate);

    return firstMonth === lastMonth ? firstMonth : `${firstMonth} - ${lastMonth}`;
  }, [chartHistory]);

  function selectPreviousMonth() {
    if (!canGoPreviousMonth) {
      return;
    }
    setSelectedMonthKey(monthOptions[selectedMonthIndex - 1].key);
    setHoveredPointKey(null);
  }

  function selectNextMonth() {
    if (!canGoNextMonth) {
      return;
    }
    setSelectedMonthKey(monthOptions[selectedMonthIndex + 1].key);
    setHoveredPointKey(null);
  }

  return (
    <div className="epds-trend-shell">
      <div className="epds-chart-card">
        {compactLayout.points.length > 0 ? (
          <>
            <div className="month-toggle-row" aria-label="EPDS trend month navigation">
              <div className="month-toggle-group">
                <button
                  type="button"
                  className="month-toggle-btn"
                  onClick={selectPreviousMonth}
                  disabled={!canGoPreviousMonth}
                  aria-label="Previous month"
                  title="Previous month"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <span className="selected-month-label">{selectedMonthLabel}</span>
                <button
                  type="button"
                  className="month-toggle-btn"
                  onClick={selectNextMonth}
                  disabled={!canGoNextMonth}
                  aria-label="Next month"
                  title="Next month"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <ChartSvg
              points={compactLayout.points}
              axisLabels={compactLayout.axisLabels}
              hoveredPointKey={hoveredPointKey}
              onHoverPoint={setHoveredPointKey}
            />
            <p className="chart-month-label">{selectedMonthLabel}</p>
          </>
        ) : (
          <div className="epds-empty-state">
            <h4>No EPDS tests recorded</h4>
            <p>EPDS trend points will appear here after the mother submits assessments.</p>
          </div>
        )}
      </div>

      {chartHistory.length > 0 ? (
        <div className="epds-chart-actions">
          <button
            type="button"
            className="epds-history-link-btn"
            onClick={(event) => {
              event.stopPropagation();
              setIsHistoryModalOpen(true);
            }}
          >
            <Maximize2 size={16} aria-hidden="true" />
            View full score history
          </button>
        </div>
      ) : null}

      {isHistoryModalOpen ? (
        <div
          className="epds-history-modal-overlay"
          onClick={() => setIsHistoryModalOpen(false)}
          role="presentation"
        >
          <div
            className="epds-history-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Full EPDS score history"
          >
            <div className="epds-history-modal-header">
              <div>
                <h3>Full EPDS Score History</h3>
                <p>{chartRangeLabel}</p>
              </div>
              <button
                type="button"
                className="epds-history-close-btn"
                onClick={() => setIsHistoryModalOpen(false)}
                aria-label="Close full score history"
                title="Close"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="epds-history-chart-card">
              <ChartSvg
                points={historyLayout.points}
                axisLabels={historyLayout.axisLabels}
                hoveredPointKey={hoveredHistoryPointKey}
                onHoverPoint={setHoveredHistoryPointKey}
                full
              />
            </div>

            <div className="epds-history-table-shell">
              <table className="epds-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {[...chartHistory].reverse().map((point, index) => (
                    <tr key={`${point.submittedAt || point.label}-${index}`}>
                      <td>{formatShortDate(point.date, point.label)}</td>
                      <td>{point.score}</td>
                      <td>
                        <span className={`epds-history-risk risk-${riskClass(point.score)}`}>
                          {riskLabel(point.score)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
