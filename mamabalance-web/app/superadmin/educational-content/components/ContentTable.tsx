import { Eye, FileText, Pencil, Search, Trash2 } from "lucide-react";

import { EducationalContentRecord } from "@/lib/education/types";

type Props = {
  data: EducationalContentRecord[];
  onView: (item: EducationalContentRecord) => void;
  onEdit?: (item: EducationalContentRecord) => void;
  onDelete?: (item: EducationalContentRecord) => void;
  onVisibilityChange?: (
    item: EducationalContentRecord,
    visibility: "visible" | "hidden",
  ) => void;
  isUpdatingVisibility?: (item: EducationalContentRecord) => boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  emptyStateVariant?: "default" | "search";
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  emptyStateTips?: string[];
};

export default function ContentTable({
  data,
  onView,
  onEdit,
  onDelete,
  onVisibilityChange,
  isUpdatingVisibility,
  canEdit = false,
  canDelete = false,
  emptyStateVariant = "search",
  emptyStateTitle = "No matching content found",
  emptyStateMessage = "Try a different keyword or clear the current filters.",
  emptyStateTips = ["Check spelling", "Try fewer keywords", "Clear filters"],
}: Props) {
  return (
    <div className="table-card">
      {data.length === 0 ? (
        <div className="doctor-empty-state">
          <div className="doctor-empty-state-icon" aria-hidden="true">
            {emptyStateVariant === "search" ? (
              <Search size={26} strokeWidth={2.2} />
            ) : (
              <FileText size={26} strokeWidth={2.2} />
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
              <th className="content-id-col">Content ID</th>
              <th className="content-title-col">Title</th>
              <th className="content-type-col">Audience</th>
              <th className="content-type-col">Type</th>
              <th className="content-date-col">Date Added</th>
              <th className="visibility-col">Visibility</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td className="content-id-col">{item.contentId}</td>
                <td className="content-title-col">
                  <span className="content-title-text" title={item.title}>
                    {item.title}
                  </span>
                </td>
                <td className="content-type-col">{item.audienceLabel}</td>
                <td className="content-type-col">{item.typeLabel}</td>
                <td className="content-date-col">{item.dateAdded}</td>

                <td>
                  {onVisibilityChange ? (
                    <button
                      type="button"
                      className={`status-toggle-button ${
                        item.visibility === "visible" ? "active" : "inactive"
                      }`}
                      disabled={isUpdatingVisibility?.(item)}
                      onClick={() =>
                        onVisibilityChange(
                          item,
                          item.visibility === "visible" ? "hidden" : "visible",
                        )
                      }
                    >
                      <span className="status-dot" aria-hidden="true" />
                      <span>{item.visibilityLabel}</span>
                      <span className="status-toggle-hint">
                        {item.visibility === "visible" ? "Hide" : "Show"}
                      </span>
                    </button>
                  ) : (
                    <span
                      className={`status-display-pill ${
                        item.visibility === "visible" ? "active" : "inactive"
                      }`}
                    >
                      <span className="status-dot" aria-hidden="true" />
                      {item.visibilityLabel}
                    </span>
                  )}
                </td>

                <td className="actions-col actions-cell">
                  <div className="actions content-table-actions">
                    <Eye className="icon-view" onClick={() => onView(item)} />

                    {canEdit && onEdit && (
                      <Pencil className="icon-edit" onClick={() => onEdit(item)} />
                    )}

                    {canDelete && onDelete && (
                      <Trash2 className="icon-delete" onClick={() => onDelete(item)} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
