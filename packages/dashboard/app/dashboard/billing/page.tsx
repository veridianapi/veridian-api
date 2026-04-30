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
    features: [
      "500 verifications / month",
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
    limit: 2000,
    description: "Up to 2,000 verifications/month",
    features: [
      "2,000 verifications / month",
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
    limit: 10000,
    description: "Up to 10,000 verifications/month",
    features: [
      "10,000 verifications / month",
      "All document types",
      "Full sanctions + PEP database",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
];

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
  const limit = currentPlan?.limit ?? 50;
  const usagePct = Math.min(100, Math.round((usage / limit) * 100));

  // DESIGN.md §7: 0-79=brand, 80-99=warning, 100=danger
  const usageBarColor =
    usagePct >= 100 ? "#dc2626" : usagePct >= 80 ? "#d97706" : "#1d9e75";

  const currentPlanIdx = PLANS.findIndex((p) => p.id === customer?.plan);

  return (
    <div>
      <PageHeader title="Billing" subtitle="Manage your plan and usage" />

      {/* Current plan summary */}
      <div className="vd-card mb-8">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f0f4f3", textTransform: "capitalize" }}>
                {customer?.plan ?? "Free"} Plan
              </h2>
              {customer?.subscription_status && (
                <span className={`vd-badge ${customer.subscription_status === "active" ? "vd-badge-active" : "vd-badge-neutral"}`}>
                  {customer.subscription_status}
                </span>
              )}
            </div>
            {customer?.next_billing_date && (
              <p style={{ fontSize: 13, color: "#a3b3ae" }}>
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
              <span className="vd-metric-value">{currentPlan.price}</span>
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
            <span className="text-sm" style={{ color: "#f0f4f3", fontWeight: 600 }}>
              {usage.toLocaleString()}{" "}
              <span style={{ fontWeight: 400, color: "#a3b3ae" }}>
                / {limit.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="vd-progress-track">
            <div
              className="vd-progress-fill"
              style={{ width: `${usagePct}%`, backgroundColor: usageBarColor }}
            />
          </div>
          {usagePct >= 80 && (
            <p className="text-xs mt-2" style={{ color: usagePct >= 100 ? "#dc2626" : "#d97706" }}>
              {usagePct >= 100
                ? "You've reached your monthly limit. Upgrade to restore access."
                : "You're close to your monthly limit. Upgrade to avoid interruptions."}
            </p>
          )}
        </div>
      </div>

      {/* Plans section label */}
      <p className="vd-field-label mb-4">Available Plans</p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {PLANS.map((plan, idx) => {
          const isCurrent = plan.id === customer?.plan;
          const isUpgrade = idx > currentPlanIdx && currentPlanIdx !== -1;
          const isMostPopular = plan.id === "growth";

          const card = (
            <div
              key={plan.id}
              className="vd-card"
              style={{
                border: isCurrent
                  ? "2px solid #1d9e75"
                  : isMostPopular
                  ? "1px solid rgba(29,158,117,0.40)"
                  : undefined,
                boxShadow: isMostPopular
                  ? "0 0 0 1px rgba(29,158,117,0.15)"
                  : undefined,
              }}
            >
              {/* Plan name + current badge */}
              <div className="flex items-center justify-between mb-1">
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#f0f4f3" }}>
                  {plan.name}
                </h3>
                {isCurrent && (
                  <span className="vd-badge vd-badge-brand">Current plan</span>
                )}
              </div>

              {/* Price */}
              <div className="mb-1">
                <span className="vd-metric-value">{plan.price}</span>
                <span className="text-sm" style={{ color: "#a3b3ae" }}>{plan.period}</span>
              </div>

              {/* Description */}
              <p className="text-xs mb-5" style={{ color: "#a3b3ae" }}>{plan.description}</p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
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
                  className="vd-btn w-full cursor-default select-none opacity-50"
                  style={{ border: "1px solid rgba(29,158,117,0.30)", color: "#1d9e75", backgroundColor: "transparent" }}
                >
                  Current plan
                </div>
              ) : (
                <SwitchPlanButton
                  plan={plan.id}
                  label={isUpgrade ? "Upgrade" : "Switch"}
                  isUpgrade={isUpgrade}
                />
              )}
            </div>
          );

          if (isMostPopular) {
            return (
              <div key={plan.id} style={{ position: "relative", paddingTop: 20 }}>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <span className="vd-badge" style={{ backgroundColor: "#1d9e75", color: "#050a09" }}>
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
