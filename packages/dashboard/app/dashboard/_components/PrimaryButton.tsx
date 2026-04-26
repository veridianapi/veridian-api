import React from "react";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: React.CSSProperties;
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
  style,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 text-[13px] font-medium hover:opacity-90 active:scale-[0.98] disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: "#1d9e75",
        color: "#050a09",
        height: 36,
        padding: "0 16px",
        borderRadius: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
