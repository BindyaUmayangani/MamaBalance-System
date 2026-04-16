type Props = {
  title: string;
  onClose: () => void;
  onDelete: () => void;
  isSubmitting?: boolean;
};

export default function DeleteContentModal({
  title,
  onClose,
  onDelete,
  isSubmitting = false,
}: Props) {
  return (
    <>
      <h2 className="modal-title danger">DELETE CONTENT</h2>
      <p className="delete-text">
        Are you sure you want to delete <strong>{title}</strong>?
      </p>

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </button>
        <button className="btn-danger" onClick={onDelete} disabled={isSubmitting}>
          {isSubmitting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </>
  );
}
