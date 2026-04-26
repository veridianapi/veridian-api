import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  iconBg?: string;
  py?: number;
}

export function EmptyState({ icon, title, description, action, iconBg = "rgba(255,255,255,0.04)", py = 20 }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-${py} text-center px-6`}>
      {icon && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
      )}
      <p className="text-base font-medium mb-1" style={{ color: "#a3b3ae" }}>
        {title}
      </p>
      {description && (
        <p className="text-sm mb-4" style={{ color: "#5a7268" }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
