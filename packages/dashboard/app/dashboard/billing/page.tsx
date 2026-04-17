import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import SwitchPlanButton from "./SwitchPlanButton";

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

  // DESIGN.md §7 progress bar colors: 0-79=brand, 80-99=warning, 100=danger
  const usageBarColor =
    usagePct >= 100 ? "#dc2626" : usagePct >= 80 ? "#d97706" : "#1d9e75";

  const currentPlanIdx = PLANS.findIndex((p) => p.id === customer?.plan);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#f0f4f3", letterSpacing: "-0.704px" }}>Billing</h1>
        <p className="text-sm mt-1" style={{ color: "#a3b3ae" }}>
          Manage your plan and usage
        </p>
      </div>

      {/* Current plan summary card */}
      <div
        className="card-lift rounded-xl p-6 mb-8"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold capitalize" style={{ color: "#f0f4f3" }}>
                {customer?.plan ?? "Free"} Plan
              </h2>
              {customer?.subscription_status && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 510,
                    letterSpacing: "0.02em",
                    textTransform: "capitalize",
                    ...(customer.subscription_status === "active"
                      ? { backgroundColor: "rgba(29,158,117,0.15)", color: "#1d9e75" }
                      : { backgroundColor: "rgba(255,255,255,0.06)", color: "#5a7268" }),
                  }}
                >
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
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  color: "#f0f4f3",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {currentPlan.price}
              </span>
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
            <span className="text-sm font-semibold" style={{ color: "#f0f4f3" }}>
              {usage.toLocaleString()}{" "}
              <span style={{ fontWeight: 400, color: "#a3b3ae" }}>
                / {limit.toLocaleString()}
              </span>
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 4, backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full"
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

      {/* Plan cards */}
      <h2
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#5a7268",
          marginBottom: 16,
        }}
      >
        Available Plans
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {PLANS.map((plan, idx) => {
          const isCurrent = plan.id === customer?.plan;
          const isUpgrade = idx > currentPlanIdx && currentPlanIdx !== -1;
          const isMostPopular = plan.id === "growth";

          // Growth card is wrapped in a relative container so the badge
          // can be absolutely positioned above the card edge.
          const card = (
            <div
              key={plan.id}
              className="card-lift rounded-xl p-6"
              style={{
                backgroundColor: "#111916",
                border: isCurrent
                  ? "2px solid #1d9e75"
                  : isMostPopular
                  ? "1px solid rgba(29,158,117,0.40)"
                  : "1px solid rgba(255,255,255,0.08)",
                boxShadow: isMostPopular
                  ? "0 0 0 1px rgba(29,158,117,0.15)"
                  : undefined,
              }}
            >
              {/* Plan name + badge */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold" style={{ color: "#f0f4f3" }}>
                  {plan.name}
                </h3>
                {isCurrent && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 500,
                      backgroundColor: "rgba(29,158,117,0.15)",
                      color: "#1d9e75",
                    }}
                  >
                    Current plan
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-1">
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    color: "#f0f4f3",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {plan.price}
                </span>
                <span className="text-sm" style={{ color: "#a3b3ae" }}>{plan.period}</span>
              </div>

              {/* Limit */}
              <p className="text-xs mb-5" style={{ color: "#a3b3ae" }}>{plan.description}</p>

              {/* Feature list */}
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: "#a3b3ae" }}
                  >
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
                  className="w-full text-[13px] font-medium text-center cursor-default select-none flex items-center justify-center"
                  style={{
                    border: "1px solid rgba(29,158,117,0.30)",
                    color: "#1d9e75",
                    height: 36,
                    borderRadius: 8,
                    opacity: 0.5,
                  }}
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

          // Growth card gets a relative wrapper so the badge floats above it
          if (isMostPopular) {
            return (
              <div key={plan.id} style={{ position: "relative", paddingTop: 20 }}>
                {/* "Most popular" badge centred above the card edge */}
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
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      backgroundColor: "#1d9e75",
                      color: "#050a09",
                    }}
                  >
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
