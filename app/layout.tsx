import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "../components/ui/theme-provider";
import { isDatabaseDataMode } from "../lib/data-mode";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { PLATFORM_NAME, PLATFORM_DESCRIPTION } from "../lib/config";

export const metadata: Metadata = {
  title: PLATFORM_NAME,
  description: PLATFORM_DESCRIPTION,
};

const sidebarPreferenceStorageKey = isDatabaseDataMode
  ? "nv-hub-ui-storage-v1"
  : "hub-power-ponto-storage";

const sidebarPreferenceBootstrap = `
try {
  const persisted = JSON.parse(localStorage.getItem(${JSON.stringify(sidebarPreferenceStorageKey)}) || "null");
  document.documentElement.dataset.sidebarCollapsed = String(persisted?.state?.isSidebarCollapsed === true);
} catch {
  document.documentElement.dataset.sidebarCollapsed = "false";
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-sidebar-collapsed="false"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Script id="sidebar-preference-bootstrap" strategy="beforeInteractive">
          {sidebarPreferenceBootstrap}
        </Script>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
