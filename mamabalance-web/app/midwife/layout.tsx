import MidwifeSidebar from "@/components/midwife/MidwifeSidebar";
import RoleAccountBar from "@/components/common/RoleAccountBar";
import { requireStaffSession } from "@/lib/auth/server";
import "@/app/styles/RoleSettingsSupport.css";
import "@/app/doctor/styles/DoctorPageHeader.css";

export default async function MidwifeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffSession(["midwife"]);

  return (
    <div className="layout">
      <MidwifeSidebar />
      <main
        className="main-content"
        style={{ flex: 1, padding: "5px", backgroundColor: "#f0fff9", minHeight: "100vh" }}
      >
        <RoleAccountBar
          user={{
            name: user.displayName || "Midwife",
            role: "Midwife",
          }}
        />
        {children}
      </main>
    </div>
  );
}
