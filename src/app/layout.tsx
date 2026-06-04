import type { Metadata, Viewport } from "next";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import NfcStatusBanner from "../components/NfcStatusBanner";
import "./globals.css";

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
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "'Inter', sans-serif" }}
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
