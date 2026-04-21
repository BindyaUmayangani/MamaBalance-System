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

export const EDUCATIONAL_CONTENT_AUDIENCES = [
  "mother",
  "father",
] as const;

export type EducationalContentType =
  (typeof EDUCATIONAL_CONTENT_TYPES)[number];

export type EducationalContentVisibility =
  (typeof EDUCATIONAL_CONTENT_VISIBILITIES)[number];

export type EducationalContentAudience =
  (typeof EDUCATIONAL_CONTENT_AUDIENCES)[number];

export type EducationalContentRecord = {
  id: string;
  contentId: string;
  title: string;
  description: string;
  audience: EducationalContentAudience;
  audienceLabel: string;
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
  audience: EducationalContentAudience;
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

export function isEducationalContentAudience(
  value: string | null | undefined,
): value is EducationalContentAudience {
  return EDUCATIONAL_CONTENT_AUDIENCES.includes(
    value as EducationalContentAudience,
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

export function getEducationalContentAudienceLabel(
  audience: EducationalContentAudience,
) {
  return audience === "father" ? "Fathers" : "Mothers";
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
