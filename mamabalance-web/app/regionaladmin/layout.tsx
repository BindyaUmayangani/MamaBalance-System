import RegionalAdminSidebar from "@/components/regionaladmin/Sidebar";
import { requireStaffSession } from "@/lib/auth/server";
import "./layout.css";

export default async function RegionalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffSession(["regionaladmin"]);

  return (
    <div className="regional-layout">
      <RegionalAdminSidebar />
      <main className="regional-content">
        {children}
      </main>
    </div>
  );
}
