import { EducationalContentRecord } from "@/lib/education/types";

import ContentFormModal from "./ContentFormModal";

type Props = {
  content: EducationalContentRecord;
  onClose: () => void;
  onSaved: (content: EducationalContentRecord) => void;
};

export default function EditContentModal({
  content,
  onClose,
  onSaved,
}: Props) {
  return (
    <ContentFormModal
      mode="edit"
      content={content}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
