export const MEDICINE_FORMS = [
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "other",
] as const;

export const MEDICINE_CATEGORIES = [
  "SSRI",
  "SNRI",
  "Other Antidepressant",
  "Anti-anxiety",
  "Sleep Support",
  "Supplement",
  "Other",
] as const;

export const MEDICINE_STATUSES = ["active", "inactive"] as const;

export const MEDICINE_SUGGESTION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type MedicineForm = (typeof MEDICINE_FORMS)[number];
export type MedicineCategory = (typeof MEDICINE_CATEGORIES)[number];
export type MedicineStatus = (typeof MEDICINE_STATUSES)[number];
export type MedicineSuggestionStatus =
  (typeof MEDICINE_SUGGESTION_STATUSES)[number];

export type MedicineRecord = {
  id: string;
  medicineId: string;
  brandName: string;
  genericName: string;
  strength: string;
  form: MedicineForm;
  formLabel: string;
  category: MedicineCategory;
  defaultNotes: string;
  status: MedicineStatus;
  statusLabel: string;
  displayName: string;
  searchText: string;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  updatedByName: string;
};

export type MedicinePayload = {
  brandName: string;
  genericName: string;
  form: MedicineForm;
  category: string;
  defaultNotes: string;
  status: MedicineStatus;
};

export type MedicineSuggestionRecord = {
  id: string;
  suggestionId: string;
  brandName: string;
  genericName: string;
  strength: string;
  form: MedicineForm;
  formLabel: string;
  defaultNotes: string;
  status: MedicineSuggestionStatus;
  statusLabel: string;
  displayName: string;
  searchText: string;
  suggestedByName: string;
  suggestedByRole: string;
  createdAt: string;
  updatedAt: string;
  linkedMedicineId: string | null;
};

export function isMedicineForm(
  value: string | null | undefined,
): value is MedicineForm {
  return MEDICINE_FORMS.includes(value as MedicineForm);
}

export function isMedicineStatus(
  value: string | null | undefined,
): value is MedicineStatus {
  return MEDICINE_STATUSES.includes(value as MedicineStatus);
}

export function isMedicineCategory(
  value: string | null | undefined,
): value is MedicineCategory {
  return MEDICINE_CATEGORIES.includes(value as MedicineCategory);
}

export function isMedicineSuggestionStatus(
  value: string | null | undefined,
): value is MedicineSuggestionStatus {
  return MEDICINE_SUGGESTION_STATUSES.includes(
    value as MedicineSuggestionStatus,
  );
}

export function getMedicineFormLabel(form: MedicineForm) {
  switch (form) {
    case "tablet":
      return "Tablet";
    case "capsule":
      return "Capsule";
    case "syrup":
      return "Syrup";
    case "injection":
      return "Injection";
    case "other":
      return "Other";
  }
}

export function getMedicineStatusLabel(status: MedicineStatus) {
  return status === "active" ? "Active" : "Inactive";
}

export function getMedicineSuggestionStatusLabel(
  status: MedicineSuggestionStatus,
) {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
  }
}

export function buildMedicineDisplayName(input: {
  brandName?: string | null;
  genericName?: string | null;
  strength?: string | null;
}) {
  const brandName = `${input.brandName || ""}`.trim();
  const genericName = `${input.genericName || ""}`.trim();
  const strength = `${input.strength || ""}`.trim();

  const left = brandName || genericName || "Unnamed medicine";
  const detailParts = [brandName && genericName ? genericName : "", strength]
    .filter((part) => part.trim().length > 0)
    .join(" - ");

  return detailParts ? `${left} (${detailParts})` : left;
}

export function buildMedicineSearchText(input: {
  brandName?: string | null;
  genericName?: string | null;
  form?: string | null;
  category?: string | null;
}) {
  return [input.brandName, input.genericName, input.form, input.category]
    .map((item) => `${item || ""}`.trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}
