import {
  EducationalContentAudience,
  EducationalContentRecord,
} from "@/lib/education/types";

import ContentFormModal from "./ContentFormModal";

type Props = {
  defaultAudience: EducationalContentAudience;
  onClose: () => void;
  onSaved: (content: EducationalContentRecord) => void;
};

export default function AddContentModal({
  defaultAudience,
  onClose,
  onSaved,
}: Props) {
  return (
    <ContentFormModal
      mode="create"
      defaultAudience={defaultAudience}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
