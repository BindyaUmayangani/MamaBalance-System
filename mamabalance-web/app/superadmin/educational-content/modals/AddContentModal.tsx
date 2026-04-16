import { EducationalContentRecord } from "@/lib/education/types";

import ContentFormModal from "./ContentFormModal";

type Props = {
  onClose: () => void;
  onSaved: (content: EducationalContentRecord) => void;
};

export default function AddContentModal({ onClose, onSaved }: Props) {
  return (
    <ContentFormModal
      mode="create"
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
