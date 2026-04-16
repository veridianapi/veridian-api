import Link from "next/link";

interface Props {
  hasApiKey: boolean;
  hasVerification: boolean;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "#111916",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const iconCircleStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  backgroundColor: "rgba(29,158,117,0.12)",
  color: "#1d9e75",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const linkButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: 13,
  fontWeight: 500,
  color: "#1d9e75",
  marginTop: "auto",
};

export default function QuickActions({ hasApiKey, hasVerification }: Props) {
  if (hasApiKey && hasVerification) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        marginBottom: 32,
      }}
    >
      {/* Card 1: Create API key */}
      <div style={cardStyle}>
        <div style={iconCircleStyle}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#f0f4f3", marginBottom: 4 }}>
            Create API key
          </p>
          <p style={{ fontSize: 13, color: "#5a7268", lineHeight: 1.5 }}>
            Get your API key to start making requests.
          </p>
        </div>
        <Link href="/dashboard/api-keys" style={linkButtonStyle}>
          Create key →
        </Link>
      </div>

      {/* Card 2: Read the docs */}
      <div style={cardStyle}>
        <div style={iconCircleStyle}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#f0f4f3", marginBottom: 4 }}>
            Read the docs
          </p>
          <p style={{ fontSize: 13, color: "#5a7268", lineHeight: 1.5 }}>
            Learn how to integrate in 15 minutes.
          </p>
        </div>
        <a
          href="https://www.veridianapi.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          style={linkButtonStyle}
        >
          View docs →
        </a>
      </div>

      {/* Card 3: Run your first verification */}
      <div style={cardStyle}>
        <div style={iconCircleStyle}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#f0f4f3", marginBottom: 4 }}>
            Run your first verification
          </p>
          <p style={{ fontSize: 13, color: "#5a7268", lineHeight: 1.5 }}>
            Submit a test document and see results.
          </p>
        </div>
        <Link href="/dashboard/help" style={linkButtonStyle}>
          View guide →
        </Link>
      </div>
    </div>
  );
}
