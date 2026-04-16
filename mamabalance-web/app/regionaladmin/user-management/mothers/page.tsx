import { adminDb } from "@/lib/firebase/admin";
import { requireStaffSession } from "@/lib/auth/server";
import MotherManagement from "@/app/components/user-management/MotherManagement";

export default async function Page() {
  const user = await requireStaffSession(["regionaladmin"]);
  const regionId = user.regionId ?? undefined;
  let regionName: string | undefined;

  if (regionId) {
    const regionSnapshot = await adminDb.collection("regions").doc(regionId).get();
    regionName =
      (regionSnapshot.data()?.name as string | undefined) || regionId;
  }

  return (
    <MotherManagement
      role="regionaladmin"
      regionId={regionId}
      regionName={regionName}
    />
  );
}
