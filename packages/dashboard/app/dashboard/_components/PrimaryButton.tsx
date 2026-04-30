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
      className={`vd-btn vd-btn-primary ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}
