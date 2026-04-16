import SettingsWorkspace from "@/components/common/settings/SettingsWorkspace";

export default function SuperadminSettingsPage() {
  return (
    <SettingsWorkspace
      role="superadmin"
      heading="Settings"
      description="Configure platform-level preferences and keep your superadmin account details up to date."
      detailLabel="Organization"
      detailKey="organization"
    />
  );
}
