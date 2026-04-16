"use client";

import { Eye, FileText, Pencil, Search, ShieldAlert, Trash2 } from "lucide-react";

type Column = { key: string; label: string };
type TableRow = Record<string, string | number | null | undefined>;

type Props<T extends TableRow> = {
  columns: readonly Column[];
  data: T[];
  visibleColumns: Record<string, boolean>;
  onView: (row: T) => void;
  onObserve?: (row: T) => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  highlightedKey?: string;
  getHighlightKeys?: (row: T) => string[];
  emptyStateVariant?: "default" | "search";
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  emptyStateTips?: string[];
};

export default function UserTable<T extends TableRow>({
  columns,
  data,
  visibleColumns,
  onView,
  onObserve,
  onEdit,
  onDelete,
  highlightedKey = "",
  getHighlightKeys,
  emptyStateVariant = "search",
  emptyStateTitle = "No matching records found",
  emptyStateMessage = "Try a different keyword or clear the current filters.",
  emptyStateTips = ["Check spelling", "Try fewer keywords", "Clear filters"],
}: Props<T>) {
  function formatRisk(value: string | number | null | undefined) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "-";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return (
    <div className="table-card">
      {data.length === 0 ? (
        <div className="doctor-empty-state">
          <div className="doctor-empty-state-icon" aria-hidden="true">
            {emptyStateVariant === "search" ? (
              <Search size={26} strokeWidth={2.2} />
            ) : (
              <ShieldAlert size={26} strokeWidth={2.2} />
            )}
          </div>
          <h3>{emptyStateTitle}</h3>
          <p>{emptyStateMessage}</p>
          <div className="doctor-empty-state-tips">
            {emptyStateTips.map((tip) => (
              <span key={tip}>{tip}</span>
            ))}
          </div>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map(
                (col) =>
                  visibleColumns?.[col.key] !== false && (
                    <th key={col.key}>{col.label}</th>
                  ),
              )}
              <th />
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => {
              const rowHighlightKeys = getHighlightKeys?.(row) || [];
              const isHighlighted =
                Boolean(highlightedKey) && rowHighlightKeys.includes(highlightedKey);

              return (
                <tr
                  key={index}
                  data-highlight-keys={rowHighlightKeys.join(" ")}
                  className={isHighlighted ? "dashboard-highlight-row" : ""}
                >
                  {columns.map(
                    (col) =>
                      visibleColumns?.[col.key] !== false && (
                        <td key={col.key}>
                          {col.key === "status" ? (
                            <span className={`status ${row.status}`}>
                              <span className="status-dot" aria-hidden="true" />
                              {row.status === "active" ? "Active" : "Inactive"}
                            </span>
                          ) : col.key === "riskStatus" ? (
                            <span className={`risk-pill ${String(row.riskStatus || "").toLowerCase()}`}>
                              {formatRisk(row.riskStatus)}
                            </span>
                          ) : (
                            row[col.key]
                          )}
                        </td>
                      ),
                  )}
                  <td className="actions">
                    <Eye className="view-icon" onClick={() => onView(row)} />
                    {onObserve ? (
                      <FileText
                        className="observation-icon"
                        onClick={() => onObserve(row)}
                      />
                    ) : null}
                    <Pencil className="edit-icon" onClick={() => onEdit(row)} />
                    <Trash2 className="delete-icon" onClick={() => onDelete(row)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
