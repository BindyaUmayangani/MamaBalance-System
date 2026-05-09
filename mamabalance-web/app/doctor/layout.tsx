import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import RoleAccountBar from "@/components/common/RoleAccountBar";
import { requireStaffSession } from "@/lib/auth/server";
import "@/app/styles/RoleSettingsSupport.css";
import "@/app/doctor/styles/DoctorPageHeader.css";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffSession(["doctor"]);

  return (
    <div className="layout">
      <DoctorSidebar />
      <main
        className="main-content"
        style={{ flex: 1, padding: "5px", backgroundColor: "#f0fff9", minHeight: "100vh" }}
      >
        <RoleAccountBar
          user={{
            name: user.displayName || "Doctor",
            role: "Doctor",
          }}
        />
        {children}
      </main>
    </div>
  );
}
