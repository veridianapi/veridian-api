import { createClient } from "@/lib/supabase-server";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$49",
    period: "/month",
    limit: 100,
    description: "Up to 100 verifications/month",
    features: [
      "100 verifications / month",
      "Passport & ID checks",
      "OFAC sanctions screening",
      "API access",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$199",
    period: "/month",
    limit: 1000,
    description: "Up to 1,000 verifications/month",
    features: [
      "1,000 verifications / month",
      "All document types",
      "OFAC + PEP screening",
      "Webhook events",
      "Priority support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    price: "$599",
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  const limit = currentPlan?.limit ?? 100;
  const usagePct = Math.min(100, Math.round((usage / limit) * 100));

  const usageBarColor =
    usagePct >= 90
      ? "#dc2626"
      : usagePct >= 70
      ? "#d97706"
      : "#0f6e56";

  const currentPlanIdx = PLANS.findIndex((p) => p.id === customer?.plan);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your plan and usage</p>
      </div>

      {/* Current plan summary card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-base font-semibold text-gray-900 capitalize">
                {customer?.plan ?? "Free"} Plan
              </h2>
              {customer?.subscription_status && (
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    customer.subscription_status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {customer.subscription_status}
                </span>
              )}
            </div>
            {customer?.next_billing_date && (
              <p className="text-sm text-gray-400">
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
              <span className="text-2xl font-bold text-gray-900">{currentPlan.price}</span>
              <span className="text-sm text-gray-400">{currentPlan.period}</span>
            </div>
          )}
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Verifications this month
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {usage.toLocaleString()}{" "}
              <span className="font-normal text-gray-400">
                / {limit.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${usagePct}%`, backgroundColor: usageBarColor }}
            />
          </div>
          {usagePct >= 80 && (
            <p
              className={`text-xs mt-2 ${
                usagePct >= 90 ? "text-red-500" : "text-amber-500"
              }`}
            >
              {usagePct >= 90
                ? "You're close to your monthly limit. Upgrade to avoid interruptions."
                : "You've used most of your monthly quota."}
            </p>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {PLANS.map((plan, idx) => {
          const isCurrent = plan.id === customer?.plan;
          const isUpgrade = idx > currentPlanIdx && currentPlanIdx !== -1;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl p-6 transition-all duration-150 ${
                isCurrent
                  ? "border-2 shadow-sm"
                  : "border border-gray-100 shadow-sm hover:shadow-md"
              }`}
              style={isCurrent ? { borderColor: "#0f6e56" } : {}}
            >
              {/* Plan name + badge */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                {isCurrent && (
                  <span
                    className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: "#0f6e56" }}
                  >
                    Current plan
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-1">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-sm text-gray-400">{plan.period}</span>
              </div>

              {/* Limit */}
              <p className="text-xs text-gray-400 mb-5">{plan.description}</p>

              {/* Feature list */}
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg
                      className="w-4 h-4 shrink-0 mt-0.5"
                      fill="none"
                      stroke="#0f6e56"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className="w-full py-2 text-sm rounded-lg font-medium text-center border-2 text-gray-400 cursor-default select-none" style={{ borderColor: "#0f6e56", color: "#0f6e56", opacity: 0.5 }}>
                  Current plan
                </div>
              ) : (
                <form action={`${API_URL}/v1/billing/checkout`} method="POST">
                  <input type="hidden" name="plan" value={plan.id} />
                  <button
                    type="submit"
                    className={`w-full py-2.5 text-sm rounded-lg font-medium transition-all duration-150 ${
                      isUpgrade
                        ? "text-white hover:opacity-90"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                    style={isUpgrade ? { backgroundColor: "#0f6e56" } : {}}
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
