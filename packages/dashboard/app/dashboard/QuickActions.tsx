import Link from "next/link";

interface Props {
  hasApiKey: boolean;
  hasVerification: boolean;
}

const ACTIONS = [
  {
    title: "Create API key",
    desc: "Get your API key to start making requests.",
    link: { href: "/dashboard/api-keys", label: "Create key →", external: false },
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    title: "Read the docs",
    desc: "Learn how to integrate in 15 minutes.",
    link: { href: "https://www.veridianapi.com/docs", label: "View docs →", external: true },
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "Run your first verification",
    desc: "Submit a test document and see results.",
    link: { href: "/dashboard/help", label: "View guide →", external: false },
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

export default function QuickActions({ hasApiKey, hasVerification }: Props) {
  if (hasApiKey && hasVerification) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {ACTIONS.map(({ title, desc, link, icon }) => (
        <div key={title} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1d9e75]/[0.10] text-[#1d9e75] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-[#f8fafc] mb-1">{title}</p>
            <p className="text-[13px] text-[#64748b] leading-relaxed">{desc}</p>
          </div>
          {link.external ? (
            <a href={link.href} target="_blank" rel="noopener noreferrer"
              className="text-[13px] font-medium text-[#1d9e75] mt-auto hover:underline">
              {link.label}
            </a>
          ) : (
            <Link href={link.href} className="text-[13px] font-medium text-[#1d9e75] mt-auto hover:underline">
              {link.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
