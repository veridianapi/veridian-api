import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "./Sidebar";
import "../dashboard.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex h-screen" style={{ backgroundColor: "#050a09" }}>
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
