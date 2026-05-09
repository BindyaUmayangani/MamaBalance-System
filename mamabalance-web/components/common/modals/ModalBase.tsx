"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  children: React.ReactNode;
  onClose: () => void;
  showCloseIcon?: boolean;
  contentClassName?: string;
  overlayClassName?: string;
};

export default function ModalBase({
  children,
  onClose,
  showCloseIcon = false,
  contentClassName,
  overlayClassName,
}: Props) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const modal = (
    <div className={["modal-overlay", overlayClassName].filter(Boolean).join(" ")} role="presentation">
      <div
        className={["modal", contentClassName].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {showCloseIcon && (
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(modal, document.body);
}
