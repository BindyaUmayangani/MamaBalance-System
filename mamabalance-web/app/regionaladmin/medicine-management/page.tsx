"use client";

import MedicineManagementWorkspace from "@/app/components/superadmin/MedicineManagementWorkspace";

export default function RegionalAdminMedicineManagementPage() {
  return (
    <MedicineManagementWorkspace
      readOnly
      heading="Medicine Management"
      description="Review the system medicine catalog used by doctors for postpartum prescriptions."
    />
  );
}
