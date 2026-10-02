import type { Metadata } from "next";
import "./globals.css";
import UserAppShell from "@/components/UserAppShell";

export const metadata: Metadata = {
  title: "Gym Progress",
  description: "Allenamento personalizzato e monitoraggio dei progressi",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" data-scroll-behavior="smooth">
      <body><UserAppShell>{children}</UserAppShell></body>
    </html>
  );
}
