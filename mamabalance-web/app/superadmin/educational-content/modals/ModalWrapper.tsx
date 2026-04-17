type Props = {
  children: React.ReactNode;
  onClose: () => void;
  variant?: "mother" | "content" | "export";
};

export default function ModalWrapper({ children, onClose, variant }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-card ${
          variant === "mother"
            ? "mother-modal"
            : variant === "content"
            ? "content-modal"
            : variant === "export"
            ? "export-modal-shell"
            : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
