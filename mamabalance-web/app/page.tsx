import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { roleHomePath } from "@/lib/auth/types";

export default async function Home() {
  const user = await getCurrentSessionUser();

  if (user) {
    redirect(roleHomePath(user.role));
  }

  redirect("/login");
}
