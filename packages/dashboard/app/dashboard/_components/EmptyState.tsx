import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  iconBg?: string;
}

export function EmptyState({ icon, title, description, action, iconBg }: EmptyStateProps) {
  return (
    <div className="vd-empty">
      {icon && (
        <div
          className="vd-empty-icon"
          style={iconBg ? { backgroundColor: iconBg } : undefined}
        >
          {icon}
        </div>
      )}
      <p className="vd-empty-title">{title}</p>
      {description && (
        <p className="vd-empty-desc">{description}</p>
      )}
      {action}
    </div>
  );
}
