import type { Metadata } from "next";
import "./globals.css";
import UserAppShell from "@/components/UserAppShell";

export const metadata: Metadata = {
  title: "Gym Progress",
  description: "Personalized training and progress tracking",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><UserAppShell>{children}</UserAppShell></body>
    </html>
  );
}
