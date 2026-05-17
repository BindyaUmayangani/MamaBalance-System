"use client";

import DeleteConfirmContent from "@/components/common/DeleteConfirmContent";

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
    <DeleteConfirmContent
      title="Delete region"
      message={
        <>
          Are you sure you want to delete <strong>{regionName}</strong>? This
          cannot be undone.
        </>
      }
      details={[{ label: "Region", value: regionName }]}
      onCancel={onClose}
      onConfirm={onDelete}
    />
  );
}
