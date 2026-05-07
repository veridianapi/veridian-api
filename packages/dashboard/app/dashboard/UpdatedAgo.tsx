"use client";

import { useState, useEffect } from "react";

export function UpdatedAgo() {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const label =
    secs < 60
      ? `${secs}s ago`
      : secs < 3600
      ? `${Math.floor(secs / 60)}m ago`
      : `${Math.floor(secs / 3600)}h ago`;

  return <span>Updated {label}</span>;
}
