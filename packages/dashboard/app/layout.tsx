import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Veridian — Compliance Dashboard",
  description: "Compliance-as-a-Service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen" style={{ backgroundColor: "#0a0f0e", color: "#ffffff" }}>
        {children}
      </body>
    </html>
  );
}
