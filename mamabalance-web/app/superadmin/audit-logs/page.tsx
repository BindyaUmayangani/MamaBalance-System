import AuditLogsWorkspace from "@/components/common/audit/AuditLogsWorkspace";

export default function SuperAdminAuditLogsPage() {
  return (
    <AuditLogsWorkspace
      title="Audit Logs"
      subtitle="System-wide activity across all regions and admin workflows."
      exportLabel="Export Logs"
      statsLabels={{
        primary: "Total Events (24h)",
        secondary: "User Management Events",
        tertiary: "Security + Content Events",
      }}
    />
  );
}
