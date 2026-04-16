"use client";

import { X } from "lucide-react";

type Props = {
  children: React.ReactNode;
  onClose: () => void;
  showCloseIcon?: boolean;
};

export default function ModalBase({
  children,
  onClose,
  showCloseIcon = false,
}: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        {showCloseIcon && (
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
