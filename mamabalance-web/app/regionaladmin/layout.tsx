import RegionalAdminSidebar from "@/components/regionaladmin/Sidebar";
import RoleAccountBar from "@/components/common/RoleAccountBar";
import { requireStaffSession } from "@/lib/auth/server";
import "./layout.css";

export default async function RegionalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffSession(["regionaladmin"]);

  return (
    <div className="regional-layout">
      <RegionalAdminSidebar />
      <main className="regional-content">
        <RoleAccountBar
          user={{
            name: user.displayName || "Regional Admin",
            role: "Regional Admin",
          }}
        />
        {children}
      </main>
    </div>
  );
}
