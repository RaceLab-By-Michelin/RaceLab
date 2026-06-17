import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";
import { StravaToastListener } from "./components/StravaToastListener";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Michelin RaceLab",
  description: "Suivi prédictif de l'usure de vos gommes",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${notoSans.variable} h-full antialiased`}>
      <head>
        {/* Barlow Condensed for title fallback, JetBrains Mono for metrics */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap"
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-white">
        <AuthProvider>
          {children}
          <StravaToastListener />
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
