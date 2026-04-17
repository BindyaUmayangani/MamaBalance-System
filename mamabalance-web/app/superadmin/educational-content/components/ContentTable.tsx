import { Eye, FileText, Pencil, Search, Trash2 } from "lucide-react";

import { EducationalContentRecord } from "@/lib/education/types";

type Props = {
  data: EducationalContentRecord[];
  onView: (item: EducationalContentRecord) => void;
  onEdit?: (item: EducationalContentRecord) => void;
  onDelete?: (item: EducationalContentRecord) => void;
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
                <td className="content-title-col">{item.title}</td>
                <td className="content-type-col">{item.typeLabel}</td>
                <td className="content-date-col">{item.dateAdded}</td>

                <td>
                  <span
                    className={`status ${
                      item.visibility === "visible" ? "active" : "inactive"
                    }`}
                  >
                    <span className="status-dot" aria-hidden="true" />
                    {item.visibilityLabel}
                  </span>
                </td>

                <td className="actions actions-col">
                  <Eye className="icon-view" onClick={() => onView(item)} />

                  {canEdit && onEdit && (
                    <Pencil className="icon-edit" onClick={() => onEdit(item)} />
                  )}

                  {canDelete && onDelete && (
                    <Trash2 className="icon-delete" onClick={() => onDelete(item)} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
