import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roundtable Advisors",
  description: "Multi-LLM advisory council for strategic decisions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
