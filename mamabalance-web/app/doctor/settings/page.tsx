import SettingsWorkspace from "@/components/common/settings/SettingsWorkspace";

export default function DoctorSettingsPage() {
  return (
    <SettingsWorkspace
      role="doctor"
      heading="Settings"
      description="Manage your doctor profile, contact details, specialization, and notification inbox preferences."
      detailLabel="Specialization"
      detailKey="specialization"
      notificationDescription="Choose which inbox alerts stay active for your account, including mother assignments, overdue checkups, and new midwife observations."
      notificationNote="These preferences control the notification inbox for your assigned mothers. Login email stays read-only here, while your contact details and alert preferences can be updated."
    />
  );
}
