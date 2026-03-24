import type { Metadata } from "next";
import { Orbitron, Syne } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Work Timer",
  description: "Track your work hours by task",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${syne.variable} antialiased`}
    >
      <body className="min-h-screen bg-[#0e0e0e] text-[#f0f0f0]">{children}</body>
    </html>
  );
}
