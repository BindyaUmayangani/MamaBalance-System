"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, FileText, ImageIcon, Video } from "lucide-react";
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { firebaseStorage } from "@/lib/firebase/client";
import {
  EDUCATIONAL_CONTENT_AUDIENCES,
  EDUCATIONAL_CONTENT_TYPES,
  EducationalContentAudience,
  EducationalContentPayload,
  EducationalContentRecord,
  EducationalContentType,
} from "@/lib/education/types";

type Props = {
  mode: "create" | "edit";
  content?: EducationalContentRecord | null;
  defaultAudience?: EducationalContentAudience;
  onClose: () => void;
  onSaved: (content: EducationalContentRecord) => void;
};

function buildStoragePath(folderId: string, kind: "poster" | "resource", file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]+/g, "-");
  return `educational-content/${folderId}/${kind}-${Date.now()}-${safeName}`;
}

function getResourceLabel(type: EducationalContentType) {
  switch (type) {
    case "video":
      return "Upload Video File";
    case "youtube":
      return "YouTube Video URL";
    case "link":
      return "External Link";
    case "pdf":
      return "Upload PDF File";
  }
}

function getResourcePlaceholder(type: EducationalContentType) {
  switch (type) {
    case "youtube":
      return "https://www.youtube.com/watch?v=...";
    case "link":
      return "https://example.com/...";
    default:
      return "";
  }
}

export default function ContentFormModal({
  mode,
  content,
  defaultAudience = "mother",
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(content?.title || "");
  const [description, setDescription] = useState(content?.description || "");
  const [audience, setAudience] = useState<EducationalContentAudience>(
    content?.audience || defaultAudience,
  );
  const [type, setType] = useState<EducationalContentType>(content?.type || "link");
  const [visibility, setVisibility] = useState<"visible" | "hidden">(
    content?.visibility || "visible",
  );
  const [posterUrl, setPosterUrl] = useState(content?.posterUrl || "");
  const [posterPath] = useState(content?.posterPath || "");
  const [resourceUrl, setResourceUrl] = useState(content?.resourceUrl || "");
  const [resourcePath, setResourcePath] = useState(content?.resourcePath || "");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const isFileType = type === "video" || type === "pdf";
  const modalTitle = mode === "create" ? "ADD NEW CONTENT" : "UPDATE CONTENT";
  const folderId = useMemo(
    () => content?.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
    [content?.id],
  );

  const resourceAccept = type === "video" ? "video/*" : "application/pdf";
  const resourcePreviewLabel =
    type === "video" ? "Open uploaded video" : "Open uploaded PDF";

  function handlePosterChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPosterFile(file);
    setPosterUrl(URL.createObjectURL(file));
  }

  function handleResourceChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setResourceFile(file);
    setResourceUrl(URL.createObjectURL(file));
  }

  async function uploadOptionalFile(
    file: File | null,
    kind: "poster" | "resource",
    label: string,
  ) {
    if (!file) {
      return null;
    }

    const path = buildStoragePath(folderId, kind, file);
    const storageRef = ref(firebaseStorage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setStatusMessage(`Uploading ${label}...`);
    setUploadProgress(0);

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          );
          setUploadProgress(percent);
          setStatusMessage(`Uploading ${label}... ${percent}%`);
        },
        reject,
        () => resolve(),
      );
    });

    const downloadUrl = await getDownloadURL(storageRef);

    return {
      url: downloadUrl,
      path,
    };
  }

  async function handleSave() {
    setError("");
    setStatusMessage("");
    setUploadProgress(0);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!isFileType && !resourceUrl.trim()) {
      setError("Please provide the link for this content.");
      return;
    }

    if (isFileType && !resourceFile && !resourceUrl) {
      setError("Please upload the required file before saving.");
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedPoster = await uploadOptionalFile(
        posterFile,
        "poster",
        "poster image",
      );
      const uploadedResource = isFileType
        ? await uploadOptionalFile(
            resourceFile,
            "resource",
            type === "video" ? "video file" : "PDF file",
          )
        : null;

      setStatusMessage("Saving content details...");
      setUploadProgress(100);

      const payload: EducationalContentPayload & { id?: string } = {
        ...(content?.id && { id: content.id }),
        title: title.trim(),
        description: description.trim(),
        audience,
        type,
        visibility,
        posterUrl: uploadedPoster?.url || posterUrl || null,
        posterPath: uploadedPoster?.path || posterPath || null,
        resourceUrl: isFileType
          ? uploadedResource?.url || resourceUrl
          : resourceUrl.trim(),
        resourcePath: isFileType
          ? uploadedResource?.path || resourcePath || null
          : null,
      };

      const response = await fetch("/api/admin/content", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        content?: EducationalContentRecord;
        error?: string;
      };

      if (!response.ok || !data.content) {
        throw new Error(data.error || "Unable to save content.");
      }

      setStatusMessage("Content saved successfully.");
      onSaved(data.content);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save content.",
      );
      setStatusMessage("");
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="modal-title">{modalTitle}</h2>

      <div className="content-modal-scroll">
        <div className="modal-form-grid">
          <div>
            <label>Title</label>
            <input
              type="text"
              value={title}
              placeholder="Enter title"
              onChange={(event) => setTitle(event.target.value)}
            />

            <label>Description</label>
            <textarea
              rows={4}
              value={description}
              placeholder="Enter description"
              onChange={(event) => setDescription(event.target.value)}
            />

            <label>Audience</label>
            <div className="radio-group">
              {EDUCATIONAL_CONTENT_AUDIENCES.map((item) => (
                <label className="radio-option" key={item}>
                  <input
                    type="radio"
                    name="audience"
                    checked={audience === item}
                    onChange={() => setAudience(item)}
                  />
                  <span className="custom-radio"></span>
                  <span className="radio-text">
                    {item === "father" ? "Fathers" : "Mothers"}
                  </span>
                </label>
              ))}
            </div>

            <label>Content Type</label>
            <div className="field-control">
              <select
                value={type}
                onChange={(event) => {
                  const nextType = event.target.value as EducationalContentType;
                  const wasFileType = type === "video" || type === "pdf";
                  const nextIsFileType =
                    nextType === "video" || nextType === "pdf";

                  setType(nextType);

                  if (wasFileType !== nextIsFileType) {
                    setResourceUrl("");
                    setResourcePath("");
                    setResourceFile(null);
                  }
                }}
              >
                {EDUCATIONAL_CONTENT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item === "youtube"
                      ? "YouTube Video"
                      : item === "pdf"
                        ? "PDF"
                        : item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
              <span className="field-icon" aria-hidden="true">
                <ChevronDown size={18} />
              </span>
            </div>
          </div>

          <div>
            <label>Poster (Image) - Optional</label>
            <div className="content-upload-box">
              <input type="file" accept="image/*" onChange={handlePosterChange} />
              <span className="content-upload-hint">
                <ImageIcon size={16} />
                Upload a cover image if you want a visual preview.
              </span>
            </div>

            {posterUrl ? (
              <a
                className="content-resource-link"
                href={posterUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} />
                Open current poster
              </a>
            ) : null}

            <label>{getResourceLabel(type)}</label>
            {isFileType ? (
              <>
                <div className="content-upload-box">
                  <input
                    type="file"
                    accept={resourceAccept}
                    onChange={handleResourceChange}
                  />
                  <span className="content-upload-hint">
                    {type === "video" ? <Video size={16} /> : <FileText size={16} />}
                    {type === "video"
                      ? "Upload the video file that staff should watch."
                      : "Upload the PDF file staff should open."}
                  </span>
                </div>

                {resourceUrl ? (
                  <a
                    className="content-resource-link"
                    href={resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={16} />
                    {resourcePreviewLabel}
                  </a>
                ) : null}
              </>
            ) : (
              <div className="field-control">
                <input
                  type="url"
                  value={resourceUrl}
                  placeholder={getResourcePlaceholder(type)}
                  onChange={(event) => setResourceUrl(event.target.value)}
                />
                <span className="field-icon" aria-hidden="true">
                  <ExternalLink size={16} />
                </span>
              </div>
            )}

            <label>Visibility</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "visible"}
                  onChange={() => setVisibility("visible")}
                />
                <span className="custom-radio"></span>
                <span className="radio-text">Visible</span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "hidden"}
                  onChange={() => setVisibility("hidden")}
                />
                <span className="custom-radio"></span>
                <span className="radio-text">Hide</span>
              </label>
            </div>
          </div>
        </div>

        {error ? <p className="content-form-error">{error}</p> : null}
        {statusMessage ? (
          <div className="content-save-status" aria-live="polite">
            <div className="content-save-status-row">
              <span className="content-save-message">{statusMessage}</span>
              {isSubmitting ? (
                <span className="content-save-percent">{uploadProgress}%</span>
              ) : null}
            </div>

            {isSubmitting ? (
              <div className="content-progress-track" aria-hidden="true">
                <div
                  className="content-progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </button>
        <button className="btn-primary" onClick={() => void handleSave()} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </>
  );
}
