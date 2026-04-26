import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className}`}>
      <body className="min-h-screen" style={{ backgroundColor: "#0a0f0e", color: "#ffffff" }}>
        {children}
      </body>
    </html>
  );
}
