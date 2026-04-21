import { ExternalLink, FileText, ImageIcon, Layers3, ShieldCheck } from "lucide-react";

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
      <div className="content-view-hero">
        <div>
          <p className="content-view-eyebrow">Educational resource</p>
          <h2 className="modal-title content-view-title">{content.title}</h2>
          <p className="content-view-subtitle">
            Review audience targeting, publishing status, and resource links before sharing.
          </p>
        </div>

        <div className="content-view-status-card">
          <span className="content-view-status-label">Visibility</span>
          <span
            className={`status ${
              content.visibility === "visible" ? "active" : "inactive"
            }`}
          >
            <span className="status-dot" aria-hidden="true" />
            {content.visibilityLabel}
          </span>
        </div>
      </div>

      <div className="content-view-highlights">
        <div className="content-view-highlight-card">
          <span className="content-view-highlight-icon" aria-hidden="true">
            <FileText size={16} />
          </span>
          <span className="content-view-highlight-label">Content ID</span>
          <strong>{content.contentId}</strong>
        </div>
        <div className="content-view-highlight-card">
          <span className="content-view-highlight-icon" aria-hidden="true">
            <Layers3 size={16} />
          </span>
          <span className="content-view-highlight-label">Audience</span>
          <strong>{content.audienceLabel}</strong>
        </div>
        <div className="content-view-highlight-card">
          <span className="content-view-highlight-icon" aria-hidden="true">
            <ShieldCheck size={16} />
          </span>
          <span className="content-view-highlight-label">Type</span>
          <strong>{content.typeLabel}</strong>
        </div>
      </div>

      <div className="content-modal-scroll">
        <div className="view-details view-user-modal view-content-modal content-view-grid">
          <div className="detail-row content-view-card content-view-card-full">
            <span className="detail-label">Description</span>
            <span className="detail-value">{content.description || "-"}</span>
          </div>

          <div className="detail-row content-view-card">
            <span className="detail-label">Date Added</span>
            <span className="detail-value">{content.dateAdded}</span>
          </div>

          <div className="detail-row content-view-card">
            <span className="detail-label">Created By</span>
            <span className="detail-value">{content.createdByName}</span>
          </div>

          <div className="detail-row content-view-card">
            <span className="detail-label">Poster</span>
            <span className="detail-value">
              {content.posterUrl ? (
                <a
                  href={content.posterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="content-resource-link"
                >
                  <ImageIcon size={16} />
                  Open poster image
                </a>
              ) : (
                "No poster uploaded"
              )}
            </span>
          </div>

          <div className="detail-row content-view-card">
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
