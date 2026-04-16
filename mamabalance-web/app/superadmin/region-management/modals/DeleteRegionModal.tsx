"use client";

export default function DeleteRegionModal({
  regionName,
  onClose,
  onDelete,
}: {
  regionName: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <h2 className="modal-title danger">DELETE REGION</h2>

      <p style={{ marginTop: "12px", fontSize: "0.9rem" }}>
        Are you sure you want to delete the region
        <strong> “{regionName}”</strong>?
      </p>

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose}>
          Cancel
        </button>

        <button className="btn-danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </>
  );
}