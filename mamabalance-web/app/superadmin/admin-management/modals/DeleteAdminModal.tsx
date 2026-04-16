"use client";

import { useState } from "react";

type Props = {
  uid: string;
  name: string;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
};

export default function DeleteAdminModal({ uid, name, onClose, onDeleted }: Props) {
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete the admin.");
      }

      await onDeleted();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the admin.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <h2 className="modal-title danger">DELETE ADMIN</h2>

      <p className="delete-text">
        Are you sure you want to delete admin <strong>{name}</strong>?
      </p>

      {error ? <p className="form-message error">{error}</p> : null}

      <div className="modal-actions">
        <button className="btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </>
  );
}
