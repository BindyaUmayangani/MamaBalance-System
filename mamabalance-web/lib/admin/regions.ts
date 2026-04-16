import { RegionOption } from "@/lib/admin/types";

export const DEFAULT_REGIONS: RegionOption[] = [
  { id: "kaduwela", name: "Kaduwela" },
  { id: "homagama", name: "Homagama" },
  { id: "maharagama", name: "Maharagama" },
  { id: "kesbewa", name: "Kesbewa" },
];

export function normalizeRegionName(value: string | null | undefined) {
  return value || "Unassigned";
}
