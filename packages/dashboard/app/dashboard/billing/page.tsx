import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$199",
    period: "/month",
    limit: 200,
    description: "Up to 200 verifications/month",
    features: [
      "200 verifications / month",
      "Passport & ID checks",
      "OFAC sanctions screening",
      "API access",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$499",
    period: "/month",
    limit: 500,
    description: "Up to 500 verifications/month",
    features: [
      "500 verifications / month",
      "All document types",
      "OFAC + PEP screening",
      "Webhook events",
      "Priority support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    price: "$999",
    period: "/month",
    limit: 2500,
    description: "Up to 2,500 verifications/month",
    features: [
      "2,500 verifications / month",
      "All document types",
      "Full sanctions + PEP database",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: customer }, { count: usageCount }] = await Promise.all([
    supabase
      .from("customers")
      .select("plan, subscription_status, next_billing_date")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("verifications")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user!.id)
      .gte(
        "created_at",
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        ).toISOString()
      ),
  ]);

  const currentPlan = PLANS.find((p) => p.id === customer?.plan);
  const usage = usageCount ?? 0;
  const limit = currentPlan?.limit ?? 200;
  const usagePct = Math.min(100, Math.round((usage / limit) * 100));

  const usageBarColor =
    usagePct >= 90 ? "#f87171" : usagePct >= 70 ? "#fbbf24" : "#1d9e75";

  const currentPlanIdx = PLANS.findIndex((p) => p.id === customer?.plan);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-sm mt-0.5" style={{ color: "#a3b3ae" }}>
          Manage your plan and usage
        </p>
      </div>

      {/* Current plan summary card */}
      <div
        className="rounded-xl p-6 mb-8"
        style={{ backgroundColor: "#111916", border: "1px solid #1a2b25" }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-base font-semibold text-white capitalize">
                {customer?.plan ?? "Free"} Plan
              </h2>
              {customer?.subscription_status && (
                <span
                  className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                  style={
                    customer.subscription_status === "active"
                      ? { backgroundColor: "rgba(29,158,117,0.15)", color: "#1d9e75" }
                      : { backgroundColor: "rgba(163,179,174,0.15)", color: "#a3b3ae" }
                  }
                >
                  {customer.subscription_status}
                </span>
              )}
            </div>
            {customer?.next_billing_date && (
              <p className="text-sm" style={{ color: "#a3b3ae" }}>
                Next billing:{" "}
                {new Date(customer.next_billing_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
          {currentPlan && (
            <div className="text-right">
              <span className="text-2xl font-bold text-white">{currentPlan.price}</span>
              <span className="text-sm" style={{ color: "#a3b3ae" }}>{currentPlan.period}</span>
            </div>
          )}
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: "#a3b3ae" }}>
              Verifications this month
            </span>
            <span className="text-sm font-semibold text-white">
              {usage.toLocaleString()}{" "}
              <span className="font-normal" style={{ color: "#a3b3ae" }}>
                / {limit.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1a2b25" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${usagePct}%`, backgroundColor: usageBarColor }}
            />
          </div>
          {usagePct >= 80 && (
            <p className="text-xs mt-2" style={{ color: usagePct >= 90 ? "#f87171" : "#fbbf24" }}>
              {usagePct >= 90
                ? "You're close to your monthly limit. Upgrade to avoid interruptions."
                : "You've used most of your monthly quota."}
            </p>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <h2 className="text-sm font-semibold text-white mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {PLANS.map((plan, idx) => {
          const isCurrent = plan.id === customer?.plan;
          const isUpgrade = idx > currentPlanIdx && currentPlanIdx !== -1;

          return (
            <div
              key={plan.id}
              className="rounded-xl p-6 transition-all duration-150"
              style={{
                backgroundColor: "#111916",
                border: isCurrent ? "2px solid #1d9e75" : "1px solid #1a2b25",
              }}
            >
              {/* Plan name + badge */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
                {isCurrent && (
                  <span
                    className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: "rgba(29,158,117,0.20)", color: "#1d9e75" }}
                  >
                    Current plan
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-1">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-sm" style={{ color: "#a3b3ae" }}>{plan.period}</span>
              </div>

              {/* Limit */}
              <p className="text-xs mb-5" style={{ color: "#a3b3ae" }}>{plan.description}</p>

              {/* Feature list */}
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm" style={{ color: "#a3b3ae" }}>
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div
                  className="w-full py-2.5 text-sm rounded-lg font-medium text-center cursor-default select-none min-h-[44px] flex items-center justify-center"
                  style={{ border: "1px solid #1d9e75", color: "#1d9e75", opacity: 0.5 }}
                >
                  Current plan
                </div>
              ) : (
                // TODO: This raw HTML form POST does not include the Bearer token.
                // Replace with a server action or client-side fetch that attaches
                // the Authorization header before submitting to the billing API.
                <form action={`${API_URL}/v1/billing/checkout`} method="POST">
                  <input type="hidden" name="plan" value={plan.id} />
                  <button
                    type="submit"
                    className="w-full py-2.5 text-sm rounded-lg font-medium transition-all duration-150 min-h-[44px]"
                    style={
                      isUpgrade
                        ? { backgroundColor: "#1d9e75", color: "#ffffff" }
                        : { border: "1px solid #1a2b25", color: "#a3b3ae", backgroundColor: "transparent" }
                    }
                  >
                    {isUpgrade ? "Upgrade" : "Switch"}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
