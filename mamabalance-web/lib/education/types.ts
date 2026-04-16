export const EDUCATIONAL_CONTENT_TYPES = [
  "video",
  "youtube",
  "link",
  "pdf",
] as const;

export const EDUCATIONAL_CONTENT_VISIBILITIES = [
  "visible",
  "hidden",
] as const;

export type EducationalContentType =
  (typeof EDUCATIONAL_CONTENT_TYPES)[number];

export type EducationalContentVisibility =
  (typeof EDUCATIONAL_CONTENT_VISIBILITIES)[number];

export type EducationalContentRecord = {
  id: string;
  contentId: string;
  title: string;
  description: string;
  type: EducationalContentType;
  typeLabel: string;
  dateAdded: string;
  visibility: EducationalContentVisibility;
  visibilityLabel: string;
  posterUrl: string | null;
  posterPath: string | null;
  resourceUrl: string;
  resourcePath: string | null;
  createdByName: string;
};

export type EducationalContentPayload = {
  title: string;
  description: string;
  type: EducationalContentType;
  visibility: EducationalContentVisibility;
  posterUrl?: string | null;
  posterPath?: string | null;
  resourceUrl: string;
  resourcePath?: string | null;
};

export function isEducationalContentType(
  value: string | null | undefined,
): value is EducationalContentType {
  return EDUCATIONAL_CONTENT_TYPES.includes(
    value as EducationalContentType,
  );
}

export function isEducationalContentVisibility(
  value: string | null | undefined,
): value is EducationalContentVisibility {
  return EDUCATIONAL_CONTENT_VISIBILITIES.includes(
    value as EducationalContentVisibility,
  );
}

export function getEducationalContentTypeLabel(
  type: EducationalContentType,
) {
  switch (type) {
    case "video":
      return "Video";
    case "youtube":
      return "YouTube Video";
    case "link":
      return "Link";
    case "pdf":
      return "PDF";
  }
}

export function getEducationalContentVisibilityLabel(
  visibility: EducationalContentVisibility,
) {
  return visibility === "visible" ? "Visible" : "Hidden";
}

export function getEducationalContentResourceLabel(
  type: EducationalContentType,
) {
  switch (type) {
    case "video":
      return "Open uploaded video";
    case "youtube":
      return "Open YouTube video";
    case "link":
      return "Open link";
    case "pdf":
      return "Open uploaded PDF";
  }
}

