"use client";

import { useState } from "react";
import DeleteConfirmContent from "@/components/common/DeleteConfirmContent";

type Props = {
  uid: string;
  role: string;
  name: string;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
};

export default function UserDeleteModal({ uid, role, name, onClose, onDeleted }: Props) {
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
        throw new Error(payload.error || "Unable to delete the user.");
      }

      await onDeleted();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the user.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <DeleteConfirmContent
        title={`Delete ${role}`}
        message={
          <>
            Are you sure you want to delete <strong>{name}</strong>? This cannot
            be undone.
          </>
        }
        details={[
          { label: "User role", value: role },
          { label: "User name", value: name },
        ]}
        isPending={isDeleting}
        onCancel={onClose}
        onConfirm={() => void handleDelete()}
      />

      {error ? <p className="form-message error">{error}</p> : null}
    </>
  );
}
