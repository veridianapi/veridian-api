import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import SwitchPlanButton from "./SwitchPlanButton";
import { PageHeader } from "../_components/PageHeader";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$199",
    period: "/month",
    limit: 500,
    description: "Up to 500 verifications/month",
    features: ["500 verifications / month", "Passport & ID checks", "OFAC sanctions screening", "API access", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$499",
    period: "/month",
    limit: 2000,
    description: "Up to 2,000 verifications/month",
    features: ["2,000 verifications / month", "All document types", "OFAC + PEP screening", "Webhook events", "Priority support"],
  },
  {
    id: "scale",
    name: "Scale",
    price: "$999",
    period: "/month",
    limit: 10000,
    description: "Up to 10,000 verifications/month",
    features: ["10,000 verifications / month", "All document types", "Full sanctions + PEP database", "Dedicated account manager", "SLA guarantee"],
  },
];

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: customer }, { count: usageCount }] = await Promise.all([
    supabase.from("customers").select("plan, subscription_status, next_billing_date").eq("id", user!.id).single(),
    supabase.from("verifications").select("id", { count: "exact", head: true }).eq("customer_id", user!.id)
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  const currentPlan = PLANS.find((p) => p.id === customer?.plan);
  const usage = usageCount ?? 0;
  const limit = currentPlan?.limit ?? 50;
  const usagePct = Math.min(100, Math.round((usage / limit) * 100));
  const usageFill = usagePct >= 100 ? "bg-[#ef4444]" : usagePct >= 80 ? "bg-[#f59e0b]" : "bg-[#1d9e75]";
  const usageTextColor = usagePct >= 100 ? "text-[#ef4444]" : usagePct >= 80 ? "text-[#f59e0b]" : "";

  const currentPlanIdx = PLANS.findIndex((p) => p.id === customer?.plan);

  return (
    <div>
      <PageHeader title="Billing" subtitle="Manage your plan and usage" />

      {/* Current plan summary */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-[#f8fafc]">
                {customer?.plan ? `${customer.plan.charAt(0).toUpperCase()}${customer.plan.slice(1)} Plan` : "Free Plan"}
              </h2>
              {customer?.subscription_status && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  customer.subscription_status === "active"
                    ? "text-[#10b981] bg-[#10b981]/[0.12]"
                    : "text-[#64748b] bg-white/[0.06]"
                }`}>
                  {customer.subscription_status}
                </span>
              )}
            </div>
            {customer?.next_billing_date && (
              <p className="text-xs text-[#64748b]">
                Next billing:{" "}
                {new Date(customer.next_billing_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
          </div>
          {currentPlan && (
            <div className="text-right">
              <span className="text-2xl font-semibold text-[#f8fafc] tabular-nums">{currentPlan.price}</span>
              <span className="text-sm text-[#64748b]">{currentPlan.period}</span>
            </div>
          )}
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#94a3b8]">Verifications this month</span>
            <span className="text-sm font-semibold text-[#f8fafc] tabular-nums">
              {usage.toLocaleString()} <span className="text-[#64748b] font-normal">/ {limit.toLocaleString()}</span>
            </span>
          </div>
          <div className="h-1 rounded-full bg-white/[0.08]">
            <div className={`h-full rounded-full transition-all ${usageFill}`} style={{ width: `${usagePct}%` }} />
          </div>
          {usagePct >= 80 && (
            <p className={`text-xs mt-2 ${usageTextColor || "text-[#94a3b8]"}`}>
              {usagePct >= 100
                ? "You've reached your monthly limit. Upgrade to restore access."
                : "You're close to your monthly limit. Upgrade to avoid interruptions."}
            </p>
          )}
        </div>
      </div>

      {/* Plans */}
      <p className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] mb-4">Available Plans</p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {PLANS.map((plan, idx) => {
          const isCurrent    = plan.id === customer?.plan;
          const isUpgrade    = idx > currentPlanIdx && currentPlanIdx !== -1;
          const isMostPopular = plan.id === "growth";

          const card = (
            <div
              key={plan.id}
              className={`bg-white/[0.03] rounded-xl p-5 flex flex-col ${
                isCurrent
                  ? "border-2 border-[#1d9e75]"
                  : isMostPopular
                  ? "border border-[#1d9e75]/[0.40]"
                  : "border border-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-[#f8fafc]">{plan.name}</h3>
                {isCurrent && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-[#1d9e75] bg-[#1d9e75]/[0.12]">
                    Current plan
                  </span>
                )}
              </div>

              <div className="mb-1">
                <span className="text-2xl font-semibold text-[#f8fafc] tabular-nums">{plan.price}</span>
                <span className="text-sm text-[#64748b]">{plan.period}</span>
              </div>

              <p className="text-xs text-[#64748b] mb-5">{plan.description}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#94a3b8]">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="flex items-center justify-center h-9 border border-[#1d9e75]/[0.30] rounded-lg text-[13px] font-medium text-[#1d9e75]">
                  Current plan
                </div>
              ) : (
                <SwitchPlanButton plan={plan.id} label={isUpgrade ? "Upgrade" : "Switch"} isUpgrade={isUpgrade} />
              )}
            </div>
          );

          if (isMostPopular) {
            return (
              <div key={plan.id} className="flex flex-col">
                <div className="flex justify-center mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-[#1d9e75] bg-[#1d9e75]/[0.12]">
                    Most popular
                  </span>
                </div>
                {card}
              </div>
            );
          }

          return card;
        })}
      </div>
    </div>
  );
}
