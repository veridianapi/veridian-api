import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className = "" }: PageHeaderProps) {
  return (
    <div className={`vd-page-head ${className}`}>
      <div>
        <h1 className="vd-page-head-title">{title}</h1>
        {subtitle && <p className="vd-page-head-sub">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
