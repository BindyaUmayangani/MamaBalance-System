import Sidebar from "@/components/superadmin/Sidebar";
import { requireStaffSession } from "@/lib/auth/server";
import "./superadmin.css";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffSession(["superadmin"]);

  return (
    <div className="admin-layout">
      <Sidebar />

      <div className="admin-main">
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
