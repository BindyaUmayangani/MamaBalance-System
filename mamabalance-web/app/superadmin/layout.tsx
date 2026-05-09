import Sidebar from "@/components/superadmin/Sidebar";
import RoleAccountBar from "@/components/common/RoleAccountBar";
import { requireStaffSession } from "@/lib/auth/server";
import "./superadmin.css";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffSession(["superadmin"]);

  return (
    <div className="admin-layout">
      <Sidebar />

      <div className="admin-main">
        <RoleAccountBar
          user={{
            name: user.displayName || "Super Admin",
            role: "Super Admin",
          }}
        />
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
