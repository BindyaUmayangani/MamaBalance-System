import DeleteConfirmContent from "@/components/common/DeleteConfirmContent";

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
    <DeleteConfirmContent
      title="Delete content"
      message={
        <>
          Are you sure you want to delete <strong>{title}</strong>? This cannot
          be undone.
        </>
      }
      details={[{ label: "Content", value: title }]}
      isPending={isSubmitting}
      onCancel={onClose}
      onConfirm={onDelete}
    />
  );
}
