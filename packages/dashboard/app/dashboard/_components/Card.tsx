import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bare?: boolean;
}

export function Card({ children, className = "", style, bare = false }: CardProps) {
  const base = bare
    ? "bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden"
    : "bg-white/[0.03] border border-white/[0.08] rounded-xl p-6";
  return (
    <div className={`${base} ${className}`} style={style}>
      {children}
    </div>
  );
}
