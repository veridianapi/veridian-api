import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        backgroundColor: "#111916",
        border: "1px solid rgba(255,255,255,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
