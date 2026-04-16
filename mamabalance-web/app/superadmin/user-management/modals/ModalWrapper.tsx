"use client";
"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  onClose: () => void;
  variant?: "default" | "mother" | "view" | "content" | "compact" | "filter";
};

export default function ModalWrapper({
  children,
  onClose,
  variant = "default",
}: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-card ${
          variant === "mother"
            ? "mother-modal"
            : variant === "view"
              ? "view-modal"
              : variant === "filter"
                ? "filter-modal"
                : variant === "compact"
                  ? "compact-modal"
              : variant === "content"
                ? "content-modal"
              : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
