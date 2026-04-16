import { ExternalLink } from "lucide-react";

import {
  EducationalContentRecord,
  getEducationalContentResourceLabel,
} from "@/lib/education/types";

type Props = {
  content: EducationalContentRecord;
  onClose: () => void;
};

export default function ViewContentModal({ content, onClose }: Props) {
  return (
    <>
      <h2 className="modal-title">VIEW CONTENT</h2>

      <div className="view-details view-user-modal view-content-modal">
        <div className="detail-row">
          <span className="detail-label">Content ID</span>
          <span className="detail-value">{content.contentId}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Title</span>
          <span className="detail-value">{content.title}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Description</span>
          <span className="detail-value">{content.description}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Content Type</span>
          <span className="detail-value">{content.typeLabel}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Date Added</span>
          <span className="detail-value">{content.dateAdded}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Visibility</span>
          <span className="detail-value">
            <span
              className={`status ${
                content.visibility === "visible" ? "active" : "inactive"
              }`}
            >
              <span className="status-dot" aria-hidden="true" />
              {content.visibilityLabel}
            </span>
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Poster</span>
          <span className="detail-value">
            {content.posterUrl ? (
              <a
                href={content.posterUrl}
                target="_blank"
                rel="noreferrer"
                className="content-resource-link"
              >
                <ExternalLink size={16} />
                Open poster image
              </a>
            ) : (
              "No poster uploaded"
            )}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Resource</span>
          <span className="detail-value">
            <a
              href={content.resourceUrl}
              target="_blank"
              rel="noreferrer"
              className="content-resource-link"
            >
              <ExternalLink size={16} />
              {getEducationalContentResourceLabel(content.type)}
            </a>
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Created By</span>
          <span className="detail-value">{content.createdByName}</span>
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}
