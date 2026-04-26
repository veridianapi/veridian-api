import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className = "" }: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-8 ${className}`}>
      <div>
        <h1
          className="font-semibold"
          style={{ fontSize: 22, color: "#f0f4f3", letterSpacing: "-0.02em", marginBottom: subtitle ? 4 : 0 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: "#5a7268", fontWeight: 400 }}>{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
