import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

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

  const { count: verificationCount } = await supabase
    .from("verifications")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id);

  return (
    <div className="flex min-h-screen bg-[#050a09]">
      <Sidebar userEmail={user.email ?? ""} verificationCount={verificationCount ?? 0} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-6 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
