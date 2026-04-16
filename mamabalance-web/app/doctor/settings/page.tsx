import SettingsWorkspace from "@/components/common/settings/SettingsWorkspace";

export default function DoctorSettingsPage() {
  return (
    <SettingsWorkspace
      role="doctor"
      heading="Settings"
      description="Manage your doctor profile, contact details, specialization, and notification preferences."
      detailLabel="Specialization"
      detailKey="specialization"
    />
  );
}
