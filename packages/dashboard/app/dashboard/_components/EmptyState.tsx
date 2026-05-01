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
    <div className="flex flex-col items-center justify-center py-16 px-4 gap-3 text-center">
      {icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={iconBg ? { backgroundColor: iconBg } : { backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-[#94a3b8]">{title}</p>
      {description && <p className="text-xs text-[#64748b] max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
