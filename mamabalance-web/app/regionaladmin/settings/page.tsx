import SettingsWorkspace from "@/components/common/settings/SettingsWorkspace";

export default function RegionalAdminSettingsPage() {
  return (
    <SettingsWorkspace
      role="regionaladmin"
      heading="Settings"
      description="Manage your regional admin account, contact details, and communication preferences."
      detailLabel="Assigned Region"
      detailKey="regionName"
      detailReadonly
    />
  );
}
