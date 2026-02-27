import type { Metadata } from "next";
import "./globals.css";
import MaintenanceGuard from "@/components/MaintenanceGuard"; // 👈 هنا عملنا الإمبورت

export const metadata: Metadata = {
  title: "Fantasy 5-a-side Football",
  description: "Build your ultimate 5-a-side fantasy team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        {/* 👈 هنا غلفنا الموقع كله بالـ Guard */}
        <MaintenanceGuard>
          {children}
        </MaintenanceGuard>
      </body>
    </html>
  );
}
