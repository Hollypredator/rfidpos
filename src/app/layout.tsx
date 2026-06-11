import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import NfcStatusBanner from "../components/NfcStatusBanner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RFID POS — Otel Kapalı Devre Ödeme Sistemi",
  description: "Oteller için RFID kart tabanlı kapalı devre ödeme ve cüzdan yönetim platformu. Multi-tenant SaaS çözümü.",
  keywords: ["rfid", "pos", "otel", "ödeme", "cüzdan", "nfc", "saas"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body
        className={`${inter.className} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <NfcStatusBanner />
                {children}
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
