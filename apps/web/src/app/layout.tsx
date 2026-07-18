import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ibn Hayan Healthcare Operating System",
  description:
    "Canonical implementation of the Ibn Hayan Healthcare Operating System — implementation foundation operational.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
