import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bare?: boolean;
}

export function Card({ children, className = "", style, bare = false }: CardProps) {
  const base = bare ? "vd-card-bare" : "vd-card";
  return (
    <div className={`${base} ${className}`} style={style}>
      {children}
    </div>
  );
}
