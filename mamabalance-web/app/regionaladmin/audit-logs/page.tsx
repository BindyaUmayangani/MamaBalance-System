import AuditLogsWorkspace from "@/components/common/audit/AuditLogsWorkspace";

export default function RegionalAdminAuditLogsPage() {
  return (
    <AuditLogsWorkspace
      title="Audit Logs"
      subtitle="Region-scoped activity across regional admin, doctor, and midwife workflows in your assigned region."
      scope="regionaladmin"
      showRegionFilter={false}
      exportLabel="Export Regional Logs"
      statsLabels={{
        primary: "Regional Events (24h)",
        secondary: "Visits + Observations",
        tertiary: "Admin + Support Events",
      }}
    />
  );
}
