import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import TopNav from "./TopNav";

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
    <div className="min-h-screen bg-[#03040a]">
      <TopNav userEmail={user.email ?? ""} />
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
