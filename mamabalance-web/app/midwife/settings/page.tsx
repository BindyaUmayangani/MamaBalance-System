import SettingsWorkspace from "@/components/common/settings/SettingsWorkspace";

export default function MidwifeSettingsPage() {
  return (
    <SettingsWorkspace
      role="midwife"
      heading="Settings"
      description="Update your midwife profile, contact details, and visit workflow notification preferences."
      detailLabel="Assigned Region"
      detailKey="regionName"
      detailReadonly
    />
  );
}
