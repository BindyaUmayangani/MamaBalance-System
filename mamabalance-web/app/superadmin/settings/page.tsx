import SettingsWorkspace from "@/components/common/settings/SettingsWorkspace";

export default function SuperadminSettingsPage() {
  return (
    <SettingsWorkspace
      role="superadmin"
      heading="Settings"
      description="Configure platform-level preferences and keep your superadmin account details up to date."
      detailLabel="Organization"
      detailKey="organization"
      notificationDescription="Choose which superadmin inbox alerts stay active for support tickets, staff account activity, and educational content updates."
      notificationNote="Login email is shown for reference only. Contact email, phone number, and superadmin inbox notification preferences can be updated here."
    />
  );
}
