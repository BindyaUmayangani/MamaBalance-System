import SettingsWorkspace from "@/components/common/settings/SettingsWorkspace";

export default function MidwifeSettingsPage() {
  return (
    <SettingsWorkspace
      role="midwife"
      heading="Settings"
      description="Update your midwife profile, contact details, and inbox notification preferences."
      detailLabel="Assigned Region"
      detailKey="regionName"
      detailReadonly
      notificationDescription="Choose which midwife inbox alerts stay active for your account. These preferences cover mother assignments, high-risk cases, overdue visits, and doctor observations."
      notificationNote="Login email is shown for reference only. Contact email, phone number, and your midwife inbox notification preferences can be updated here."
    />
  );
}
