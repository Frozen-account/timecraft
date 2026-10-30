import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/components/workspace-provider";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://timecraft.pro"),
  title: "TimeCraft",
  description: "Календарь задач, проекты, память и доступ агентов к контексту — рабочее пространство команды",
  applicationName: "TimeCraft",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
